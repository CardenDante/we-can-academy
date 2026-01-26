import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";

type ChapelAttendanceRecord = {
  admissionNumber: string;
  sessionId: string;
  markedAt?: string;
  localId: string;
};

type ResultRecord = {
  localId: string;
  success: boolean;
  error?: string;
  attendanceId?: string;
  duplicate?: boolean;
  status?: string;
};

/**
 * Batch Mark Chapel Attendance - Optimized for Offline Sync
 * POST /api/mobile/chapel/attendance/batch
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   attendances: [
 *     { admissionNumber, sessionId, markedAt, localId }
 *   ]
 * }
 *
 * OPTIMIZED: Pre-fetches all data in bulk queries
 * ~6 queries for 100 items instead of ~400
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

    // Only STAFF can mark chapel attendance
    if (!hasRole(user, ["STAFF"])) {
      return NextResponse.json(
        { error: "Only staff members can mark chapel attendance" },
        { status: 403 }
      );
    }

    const { attendances } = await request.json();

    if (!attendances || !Array.isArray(attendances)) {
      return NextResponse.json(
        { error: "Attendances array is required" },
        { status: 400 }
      );
    }

    if (attendances.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        failed: 0,
        results: [],
      });
    }

    if (attendances.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 attendance records per batch" },
        { status: 400 }
      );
    }

    // ============================================
    // PHASE 1: Validate and collect IDs
    // ============================================
    const results: ResultRecord[] = [];
    const validRecords: ChapelAttendanceRecord[] = [];
    const admissionNumbers = new Set<string>();
    const sessionIds = new Set<string>();

    for (const record of attendances as ChapelAttendanceRecord[]) {
      const { admissionNumber, sessionId, localId } = record;

      if (!admissionNumber || !sessionId) {
        results.push({
          localId,
          success: false,
          error: "Missing admissionNumber or sessionId",
        });
        continue;
      }

      validRecords.push(record);
      admissionNumbers.add(admissionNumber);
      sessionIds.add(sessionId);
    }

    if (validRecords.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        failed: results.length,
        total: attendances.length,
        results,
      });
    }

    // ============================================
    // PHASE 2: Bulk fetch all required data
    // ============================================

    // Query 1: Fetch all students by admission numbers
    const students = await prisma.student.findMany({
      where: { admissionNumber: { in: [...admissionNumbers] } },
      select: {
        id: true,
        admissionNumber: true,
        fullName: true,
        isExpelled: true,
      },
    });
    const studentMap = new Map(students.map((s) => [s.admissionNumber, s]));

    // Query 2: Fetch all sessions (verify they are CHAPEL type)
    const sessions = await prisma.session.findMany({
      where: {
        id: { in: [...sessionIds] },
        sessionType: "CHAPEL",
      },
      select: {
        id: true,
        weekendId: true,
        name: true,
      },
    });
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    // Query 3: Get all weekend IDs for check-in lookup
    const weekendIds = [...new Set(sessions.map((s) => s.weekendId))];

    // Query 4: Fetch all check-ins for these students and weekends
    const studentIds = students.map((s) => s.id);
    const checkIns = await prisma.checkIn.findMany({
      where: {
        studentId: { in: studentIds },
        weekendId: { in: weekendIds },
        status: "PRESENT",
      },
      select: {
        studentId: true,
        weekendId: true,
      },
    });
    // Key: "studentId-weekendId" -> has checked in
    const checkInMap = new Map(
      checkIns.map((c) => [`${c.studentId}-${c.weekendId}`, true])
    );

    // Query 5: Fetch all existing attendances
    const attendanceKeys = validRecords
      .filter((r) => {
        const student = studentMap.get(r.admissionNumber);
        return student && sessionMap.has(r.sessionId);
      })
      .map((r) => ({
        studentId: studentMap.get(r.admissionNumber)!.id,
        sessionId: r.sessionId,
      }));

    const existingAttendances = attendanceKeys.length > 0
      ? await prisma.attendance.findMany({
          where: { OR: attendanceKeys },
          select: {
            id: true,
            studentId: true,
            sessionId: true,
          },
        })
      : [];
    const existingMap = new Map(
      existingAttendances.map((a) => [`${a.studentId}-${a.sessionId}`, a])
    );

    // ============================================
    // PHASE 3: Process records
    // ============================================
    const toCreate: Array<{
      localId: string;
      data: {
        studentId: string;
        sessionId: string;
        markedBy: string;
        markedAt: Date;
      };
    }> = [];

    for (const record of validRecords) {
      const { admissionNumber, sessionId, markedAt, localId } = record;

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
          status: "expelled",
        });
        continue;
      }

      // Check session exists and is CHAPEL
      const session = sessionMap.get(sessionId);
      if (!session) {
        results.push({
          localId,
          success: false,
          error: "Chapel session not found",
        });
        continue;
      }

      // Check if student has checked in at gate
      const checkInKey = `${student.id}-${session.weekendId}`;
      if (!checkInMap.has(checkInKey)) {
        results.push({
          localId,
          success: false,
          error: `${student.fullName} has not checked in at gate`,
          status: "not_checked_in",
        });
        continue;
      }

      // Check for existing attendance
      const existingKey = `${student.id}-${sessionId}`;
      const existing = existingMap.get(existingKey);
      if (existing) {
        results.push({
          localId,
          success: true,
          attendanceId: existing.id,
          duplicate: true,
        });
        continue;
      }

      // Queue for creation
      toCreate.push({
        localId,
        data: {
          studentId: student.id,
          sessionId,
          markedBy: user.name,
          markedAt: markedAt ? new Date(markedAt) : new Date(),
        },
      });
    }

    // ============================================
    // PHASE 4: Batch create attendances in transaction
    // ============================================
    if (toCreate.length > 0) {
      const createdAttendances = await prisma.$transaction(
        toCreate.map((item) =>
          prisma.attendance.create({
            data: item.data,
            select: { id: true },
          })
        )
      );

      for (let i = 0; i < toCreate.length; i++) {
        results.push({
          localId: toCreate[i].localId,
          success: true,
          attendanceId: createdAttendances[i].id,
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
      total: attendances.length,
      results,
    });
  } catch (error) {
    console.error("Batch chapel attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
