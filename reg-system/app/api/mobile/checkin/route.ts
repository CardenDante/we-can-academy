import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";

/**
 * Check In Student at Gate
 * POST /api/mobile/checkin
 * Headers: Authorization: Bearer <token>
 * Body: { admissionNumber: string }
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

    // Find student
    const student = await prisma.student.findUnique({
      where: { admissionNumber },
      include: {
        course: true,
      },
    });

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

    // Get current weekend
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
      return NextResponse.json(
        { error: "No active weekend found for today" },
        { status: 404 }
      );
    }

    // Determine which day (SATURDAY or SUNDAY)
    const day = dayOfWeek === 6 ? "SATURDAY" : "SUNDAY";

    // Check if already checked in for this day
    const existingCheckIn = await prisma.checkIn.findUnique({
      where: {
        studentId_weekendId_day: {
          studentId: student.id,
          weekendId: weekend.id,
          day,
        },
      },
    });

    if (existingCheckIn) {
      return NextResponse.json(
        {
          error: `${student.fullName} has already checked in for ${day}`,
          student,
          checkIn: existingCheckIn,
          status: "already_checked_in",
        },
        { status: 400 }
      );
    }

    // Create check-in record
    const checkIn = await prisma.checkIn.create({
      data: {
        studentId: student.id,
        weekendId: weekend.id,
        day,
        checkedBy: user.name,
        status: "PRESENT",
      },
      include: {
        student: {
          include: {
            course: true,
          },
        },
        weekend: true,
      },
    });

    return NextResponse.json({
      success: true,
      checkIn,
      student,
      status: "checked_in",
    });
  } catch (error: any) {
    console.error("Check-in error:", error);

    // Handle unique constraint violation
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

    // Get check-ins for today
    const checkIns = await prisma.checkIn.findMany({
      where: {
        weekendId: weekend.id,
        day,
        status: "PRESENT",
      },
      include: {
        student: {
          include: {
            course: true,
          },
        },
        weekend: true,
      },
      orderBy: {
        checkedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      checkIns,
      weekend,
      day,
    });
  } catch (error) {
    console.error("Get check-ins error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
