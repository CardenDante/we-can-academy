import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";

/**
 * Get Chapel Attendance
 * GET /api/mobile/chapel/attendance?sessionId=xxx
 * Headers: Authorization: Bearer <token>
 *
 * Returns list of students who attended the chapel session.
 * Only STAFF can view chapel attendance.
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

    // Only STAFF can view chapel attendance
    if (!hasRole(user, ["STAFF"])) {
      return NextResponse.json(
        { error: "Only staff members can view chapel attendance" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Verify session exists and is a chapel session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        sessionType: true,
        name: true,
        day: true,
        weekend: {
          select: {
            id: true,
            name: true,
            saturdayDate: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.sessionType !== "CHAPEL") {
      return NextResponse.json(
        { error: "This endpoint is only for chapel sessions" },
        { status: 400 }
      );
    }

    // Fetch attendance records
    const attendances = await prisma.attendance.findMany({
      where: { sessionId },
      select: {
        id: true,
        markedAt: true,
        markedBy: true,
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
      orderBy: { markedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        name: session.name,
        day: session.day,
        weekend: session.weekend,
      },
      attendances,
      count: attendances.length,
    });
  } catch (error) {
    console.error("Get chapel attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Mark Chapel Attendance
 * POST /api/mobile/chapel/attendance
 * Headers: Authorization: Bearer <token>
 * Body: { admissionNumber: string, sessionId: string }
 *
 * Marks a student's attendance for a chapel session.
 * Requires the student to have checked in at the gate.
 * Only STAFF can mark chapel attendance.
 *
 * OPTIMIZED: Uses parallel queries and upsert
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

    const { admissionNumber, sessionId } = await request.json();

    if (!admissionNumber || !sessionId) {
      return NextResponse.json(
        { error: "Admission number and session ID are required" },
        { status: 400 }
      );
    }

    // OPTIMIZATION: Fetch student and session in parallel
    const [student, session] = await Promise.all([
      prisma.student.findUnique({
        where: { admissionNumber },
        select: {
          id: true,
          fullName: true,
          admissionNumber: true,
          isExpelled: true,
          course: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          sessionType: true,
          weekendId: true,
          name: true,
          day: true,
        },
      }),
    ]);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

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

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.sessionType !== "CHAPEL") {
      return NextResponse.json(
        { error: "This endpoint is only for chapel sessions" },
        { status: 400 }
      );
    }

    // Check if student has checked in at the gate
    const checkInCount = await prisma.checkIn.count({
      where: {
        studentId: student.id,
        weekendId: session.weekendId,
        status: "PRESENT",
      },
    });

    if (checkInCount === 0) {
      return NextResponse.json(
        {
          error: `${student.fullName} has not checked in at the gate this weekend`,
          student,
          status: "not_checked_in",
        },
        { status: 400 }
      );
    }

    // OPTIMIZATION: Use upsert to handle concurrent marking
    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_sessionId: {
          studentId: student.id,
          sessionId: session.id,
        },
      },
      update: {}, // Don't update if exists
      create: {
        studentId: student.id,
        sessionId: session.id,
        markedBy: user.name,
      },
      select: {
        id: true,
        markedAt: true,
        markedBy: true,
      },
    });

    // Check if this was an existing record
    const isExisting = attendance.markedAt < new Date(Date.now() - 5000);

    if (isExisting) {
      return NextResponse.json(
        {
          error: `${student.fullName} has already been marked for this chapel session`,
          student,
          attendance,
          status: "already_marked",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      attendance: {
        ...attendance,
        student,
        session: {
          id: session.id,
          name: session.name,
          day: session.day,
        },
      },
      status: "marked",
    });
  } catch (error: any) {
    console.error("Mark chapel attendance error:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Student has already been marked for this session" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
