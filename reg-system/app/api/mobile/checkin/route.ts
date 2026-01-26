import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";
import { rateLimitMiddleware } from "@/lib/rate-limit";
import { cachedListResponse } from "@/lib/api-cache";

/**
 * Check In Student at Gate
 * POST /api/mobile/checkin
 * Headers: Authorization: Bearer <token>
 * Body: { admissionNumber: string }
 *
 * OPTIMIZED: Uses parallel queries and upsert for faster response
 * Rate limited: 120 requests/minute (scan profile)
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

    // Only STAFF can check in students (security/gate role)
    if (!hasRole(user, ["STAFF"])) {
      return NextResponse.json(
        { error: "Only staff members can check in students" },
        { status: 403 }
      );
    }

    // Rate limiting for scan operations
    const rateLimitError = await rateLimitMiddleware(request, user.userId, "scan");
    if (rateLimitError) return rateLimitError;

    const { admissionNumber } = await request.json();

    if (!admissionNumber) {
      return NextResponse.json(
        { error: "Admission number is required" },
        { status: 400 }
      );
    }

    // Check if it's a weekend day (Saturday or Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();

    if (dayOfWeek !== 6 && dayOfWeek !== 0) {
      // 6 = Saturday, 0 = Sunday
      return NextResponse.json(
        { error: "Check-ins are only allowed on weekends (Saturday and Sunday)" },
        { status: 400 }
      );
    }

    // Calculate Saturday date for weekend lookup
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const saturdayDate = dayOfWeek === 0
      ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
      : today;
    const day = dayOfWeek === 6 ? "SATURDAY" : "SUNDAY";

    // OPTIMIZATION: Fetch student and weekend in parallel
    const [student, weekend] = await Promise.all([
      prisma.student.findUnique({
        where: { admissionNumber },
        select: {
          id: true,
          fullName: true,
          admissionNumber: true,
          isExpelled: true,
          hasWarning: true,
          warningReason: true,
          course: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.weekend.findUnique({
        where: { saturdayDate },
        select: {
          id: true,
          saturdayDate: true,
          name: true,
        },
      }),
    ]);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Check if student is expelled
    if (student.isExpelled) {
      return NextResponse.json(
        {
          error: `ALERT: ${student.fullName} has been EXPELLED`,
          student,
          status: "expelled",
        },
        { status: 400 }
      );
    }

    if (!weekend) {
      return NextResponse.json(
        { error: "No active weekend found for today" },
        { status: 404 }
      );
    }

    // OPTIMIZATION: Use upsert to handle concurrent check-ins and avoid extra query
    // This combines the "check existing" and "create" into a single atomic operation
    const checkIn = await prisma.checkIn.upsert({
      where: {
        studentId_weekendId_day: {
          studentId: student.id,
          weekendId: weekend.id,
          day,
        },
      },
      update: {}, // Don't update if exists
      create: {
        studentId: student.id,
        weekendId: weekend.id,
        day,
        checkedBy: user.name,
        status: "PRESENT",
      },
      select: {
        id: true,
        day: true,
        checkedAt: true,
        checkedBy: true,
        status: true,
      },
    });

    // Check if this was an existing record (checkedAt will be older than a few seconds ago)
    const isExisting = checkIn.checkedAt < new Date(Date.now() - 5000);

    if (isExisting) {
      return NextResponse.json(
        {
          error: `${student.fullName} has already checked in for ${day}`,
          student,
          checkIn,
          status: "already_checked_in",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      checkIn: {
        ...checkIn,
        student,
        weekend,
      },
      student,
      status: "checked_in",
    });
  } catch (error: any) {
    console.error("Check-in error:", error);

    // Handle unique constraint violation (race condition on upsert)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Student has already checked in for this day" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get Today's Check-ins
 * GET /api/mobile/checkin
 * Headers: Authorization: Bearer <token>
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyMobileToken(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only STAFF can view check-ins
    if (!hasRole(user, ["STAFF"])) {
      return NextResponse.json(
        { error: "Only staff members can view check-ins" },
        { status: 403 }
      );
    }

    // Get today's date
    const now = new Date();
    const dayOfWeek = now.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If Sunday, look for weekend starting yesterday (Saturday)
    const saturdayDate = dayOfWeek === 0
      ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
      : today;

    const weekend = await prisma.weekend.findUnique({
      where: { saturdayDate },
    });

    if (!weekend) {
      return NextResponse.json({
        success: true,
        checkIns: [],
      });
    }

    // Determine which day
    const day = dayOfWeek === 6 ? "SATURDAY" : "SUNDAY";

    // Get check-ins for today with minimal data
    const checkIns = await prisma.checkIn.findMany({
      where: {
        weekendId: weekend.id,
        day,
        status: "PRESENT",
      },
      select: {
        id: true,
        checkedAt: true,
        checkedBy: true,
        student: {
          select: {
            id: true,
            fullName: true,
            admissionNumber: true,
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        checkedAt: "desc",
      },
    });

    // Return with cache headers (30 second cache for list data)
    return cachedListResponse({
      success: true,
      checkIns,
      weekend,
      day,
      count: checkIns.length,
    });
  } catch (error) {
    console.error("Get check-ins error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
