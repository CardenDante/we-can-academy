import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";
import { DayOfWeekend, CheckInStatus } from "@prisma/client";
import { rateLimitMiddleware } from "@/lib/rate-limit";

type CheckInRecord = {
  admissionNumber: string;
  checkedAt?: string;
  localId: string;
};

type ProcessedRecord = {
  record: CheckInRecord;
  checkInTime: Date;
  dayOfWeek: number;
  day: DayOfWeekend;
  saturdayDate: Date;
};

/**
 * Batch Check-In Students - Optimized for Offline Sync
 * POST /api/mobile/checkin/batch
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   checkIns: [
 *     { admissionNumber, checkedAt, localId }
 *   ]
 * }
 *
 * OPTIMIZED: Pre-fetches all data in bulk queries instead of N+1 pattern
 * Previous: ~300 queries for 100 items
 * Now: ~5 queries for 100 items
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyMobileToken(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only STAFF can check in students
    if (!hasRole(user, ["STAFF"])) {
      return NextResponse.json(
        { error: "Only staff members can check in students" },
        { status: 403 }
      );
    }

    // Rate limiting for batch operations
    const rateLimitError = await rateLimitMiddleware(request, user.userId, "batch");
    if (rateLimitError) return rateLimitError;

    const { checkIns } = await request.json();

    if (!checkIns || !Array.isArray(checkIns)) {
      return NextResponse.json(
        { error: "CheckIns array is required" },
        { status: 400 }
      );
    }

    if (checkIns.length === 0) {
      return NextResponse.json(
        { success: true, synced: 0, failed: 0, results: [] }
      );
    }

    if (checkIns.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 check-ins per batch" },
        { status: 400 }
      );
    }

    // ============================================
    // PHASE 1: Pre-process and validate records
    // ============================================
    const results: Array<{
      localId: string;
      success: boolean;
      error?: string;
      checkInId?: string;
      duplicate?: boolean;
      expelled?: boolean;
    }> = [];
    const validRecords: ProcessedRecord[] = [];
    const admissionNumbers: string[] = [];
    const saturdayDates: Date[] = [];

    for (const record of checkIns as CheckInRecord[]) {
      const { admissionNumber, checkedAt, localId } = record;

      // Validate admission number
      if (!admissionNumber) {
        results.push({
          localId,
          success: false,
          error: "Missing admission number",
        });
        continue;
      }

      // Parse check-in time
      const checkInTime = checkedAt ? new Date(checkedAt) : new Date();
      const dayOfWeek = checkInTime.getDay();

      // Verify it's a weekend day
      if (dayOfWeek !== 6 && dayOfWeek !== 0) {
        results.push({
          localId,
          success: false,
          error: "Check-ins only allowed on weekends",
        });
        continue;
      }

      // Calculate Saturday date for weekend lookup
      const checkDate = new Date(checkInTime);
      checkDate.setHours(0, 0, 0, 0);
      const saturdayDate = dayOfWeek === 0
        ? new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
        : checkDate;

      const day: DayOfWeekend = dayOfWeek === 6 ? DayOfWeekend.SATURDAY : DayOfWeekend.SUNDAY;

      validRecords.push({
        record,
        checkInTime,
        dayOfWeek,
        day,
        saturdayDate,
      });

      admissionNumbers.push(admissionNumber);
      saturdayDates.push(saturdayDate);
    }

    // If no valid records, return early
    if (validRecords.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        failed: results.length,
        total: checkIns.length,
        results,
      });
    }

    // ============================================
    // PHASE 2: Bulk fetch all required data (3 queries instead of 300)
    // ============================================

    // Query 1: Fetch all students by admission numbers
    const students = await prisma.student.findMany({
      where: {
        admissionNumber: { in: [...new Set(admissionNumbers)] },
      },
      select: {
        id: true,
        admissionNumber: true,
        fullName: true,
        isExpelled: true,
      },
    });
    const studentMap = new Map(students.map((s) => [s.admissionNumber, s]));

    // Query 2: Fetch all weekends by Saturday dates
    const uniqueSaturdayDates = [...new Set(saturdayDates.map((d) => d.toISOString()))];
    const weekends = await prisma.weekend.findMany({
      where: {
        saturdayDate: { in: uniqueSaturdayDates.map((d) => new Date(d)) },
      },
      select: {
        id: true,
        saturdayDate: true,
      },
    });
    const weekendMap = new Map(
      weekends.map((w) => [w.saturdayDate.toISOString().split("T")[0], w])
    );

    // Build list of check-in keys to look up
    const checkInKeys: Array<{
      studentId: string;
      weekendId: string;
      day: DayOfWeekend;
    }> = [];

    for (const item of validRecords) {
      const student = studentMap.get(item.record.admissionNumber);
      const weekendKey = item.saturdayDate.toISOString().split("T")[0];
      const weekend = weekendMap.get(weekendKey);

      if (student && weekend) {
        checkInKeys.push({
          studentId: student.id,
          weekendId: weekend.id,
          day: item.day,
        });
      }
    }

    // Query 3: Fetch all existing check-ins in one query
    const existingCheckIns = checkInKeys.length > 0
      ? await prisma.checkIn.findMany({
          where: {
            OR: checkInKeys.map((key) => ({
              studentId: key.studentId,
              weekendId: key.weekendId,
              day: key.day,
            })),
          },
          select: {
            id: true,
            studentId: true,
            weekendId: true,
            day: true,
          },
        })
      : [];

    // Create a lookup key for existing check-ins
    const existingCheckInMap = new Map(
      existingCheckIns.map((c) => [`${c.studentId}-${c.weekendId}-${c.day}`, c])
    );

    // ============================================
    // PHASE 3: Process records and create check-ins
    // ============================================
    const toCreate: Array<{
      localId: string;
      data: {
        studentId: string;
        weekendId: string;
        day: DayOfWeekend;
        checkedBy: string;
        checkedAt: Date;
        status: CheckInStatus;
      };
    }> = [];

    for (const item of validRecords) {
      const { record, checkInTime, day, saturdayDate } = item;
      const { admissionNumber, localId } = record;

      // Check student exists
      const student = studentMap.get(admissionNumber);
      if (!student) {
        results.push({
          localId,
          success: false,
          error: "Student not found",
        });
        continue;
      }

      // Check if expelled
      if (student.isExpelled) {
        results.push({
          localId,
          success: false,
          error: `${student.fullName} has been expelled`,
          expelled: true,
        });
        continue;
      }

      // Check weekend exists
      const weekendKey = saturdayDate.toISOString().split("T")[0];
      const weekend = weekendMap.get(weekendKey);
      if (!weekend) {
        results.push({
          localId,
          success: false,
          error: "No active weekend found",
        });
        continue;
      }

      // Check for existing check-in
      const existingKey = `${student.id}-${weekend.id}-${day}`;
      const existing = existingCheckInMap.get(existingKey);
      if (existing) {
        results.push({
          localId,
          success: true,
          checkInId: existing.id,
          duplicate: true,
        });
        continue;
      }

      // Queue for creation
      toCreate.push({
        localId,
        data: {
          studentId: student.id,
          weekendId: weekend.id,
          day,
          checkedBy: user.name,
          checkedAt: checkInTime,
          status: CheckInStatus.PRESENT,
        },
      });
    }

    // ============================================
    // PHASE 4: Batch create check-ins in transaction
    // ============================================
    if (toCreate.length > 0) {
      const createdCheckIns = await prisma.$transaction(
        toCreate.map((item) =>
          prisma.checkIn.create({
            data: item.data,
            select: { id: true },
          })
        )
      );

      // Map results
      for (let i = 0; i < toCreate.length; i++) {
        results.push({
          localId: toCreate[i].localId,
          success: true,
          checkInId: createdCheckIns[i].id,
        });
      }
    }

    // Count results
    const syncedCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      failed: failedCount,
      total: checkIns.length,
      results,
    });
  } catch (error) {
    console.error("Batch check-in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
