import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";
import { getCurrentDate } from "@/lib/date-utils";

/**
 * Batch Check-In Students - Optimized for Offline Sync
 * POST /api/mobile/checkin/batch
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   checkIns: [
 *     { admissionNumber, checkedAt, localId }
 *   ]
 * }
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

    // Process each check-in
    const results = [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const record of checkIns) {
      const { admissionNumber, checkedAt, localId } = record;

      try {
        if (!admissionNumber) {
          results.push({
            localId,
            success: false,
            error: "Missing admission number",
          });
          failedCount++;
          continue;
        }

        // Parse check-in time (use date utility for testing support when no checkedAt provided)
        const checkInTime = checkedAt ? new Date(checkedAt) : getCurrentDate();
        const dayOfWeek = checkInTime.getDay();

        // Verify it's a weekend day
        if (dayOfWeek !== 6 && dayOfWeek !== 0) {
          results.push({
            localId,
            success: false,
            error: "Check-ins only allowed on weekends",
          });
          failedCount++;
          continue;
        }

        // Find student
        const student = await prisma.student.findUnique({
          where: { admissionNumber },
        });

        if (!student) {
          results.push({
            localId,
            success: false,
            error: "Student not found",
          });
          failedCount++;
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
          failedCount++;
          continue;
        }

        // Get weekend
        const checkDate = new Date(checkInTime);
        checkDate.setHours(0, 0, 0, 0);

        const saturdayDate = dayOfWeek === 0
          ? new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
          : checkDate;

        const weekend = await prisma.weekend.findUnique({
          where: { saturdayDate },
        });

        if (!weekend) {
          results.push({
            localId,
            success: false,
            error: "No active weekend found",
          });
          failedCount++;
          continue;
        }

        // Determine day
        const day = dayOfWeek === 6 ? "SATURDAY" : "SUNDAY";

        // Check for duplicate
        const existing = await prisma.checkIn.findUnique({
          where: {
            studentId_weekendId_day: {
              studentId: student.id,
              weekendId: weekend.id,
              day,
            },
          },
        });

        if (existing) {
          // Already checked in - consider success (idempotent)
          results.push({
            localId,
            success: true,
            checkInId: existing.id,
            duplicate: true,
          });
          syncedCount++;
          continue;
        }

        // Create check-in
        const checkIn = await prisma.checkIn.create({
          data: {
            studentId: student.id,
            weekendId: weekend.id,
            day,
            checkedBy: user.name,
            checkedAt: checkInTime,
            status: "PRESENT",
          },
        });

        results.push({
          localId,
          success: true,
          checkInId: checkIn.id,
        });
        syncedCount++;
      } catch (error: any) {
        console.error("Batch check-in error:", error);
        results.push({
          localId,
          success: false,
          error: error.message || "Failed to check in",
        });
        failedCount++;
      }
    }

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
