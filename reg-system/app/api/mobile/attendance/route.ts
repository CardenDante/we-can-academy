import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";

/**
 * Get Attendance for a Session
 * GET /api/mobile/attendance?sessionId=xxx
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

    // Only STAFF and TEACHER can access
    if (!hasRole(user, ["STAFF", "TEACHER"])) {
      return NextResponse.json(
        { error: "Access denied" },
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

    // Build query
    const where: any = { sessionId };

    // For teachers, only show their class attendance
    if (user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.userId },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      where.classId = teacher.classId;
    }

    // Fetch attendance records
    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          include: {
            course: true,
          },
        },
        session: {
          include: {
            weekend: true,
          },
        },
        class: {
          include: {
            course: true,
          },
        },
      },
      orderBy: {
        markedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      attendances,
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Mark Attendance
 * POST /api/mobile/attendance
 * Headers: Authorization: Bearer <token>
 * Body: { studentId: string, sessionId: string, classId?: string }
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

    // Only STAFF and TEACHER can access
    if (!hasRole(user, ["STAFF", "TEACHER"])) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const { studentId, sessionId, classId } = await request.json();

    if (!studentId || !sessionId) {
      return NextResponse.json(
        { error: "Student ID and Session ID are required" },
        { status: 400 }
      );
    }

    // Get the session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { weekend: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { fullName: true, admissionNumber: true, isExpelled: true, courseId: true },
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
        { error: `${student.fullName} has been expelled and cannot be marked for attendance` },
        { status: 400 }
      );
    }

    // For teachers, verify permissions and set classId
    let finalClassId = classId;
    if (user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.userId },
        include: {
          class: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      // Verify student is in teacher's COURSE (not restricted to specific class)
      if (student.courseId !== teacher.class.courseId) {
        return NextResponse.json(
          { error: "Student is not in your course" },
          { status: 403 }
        );
      }

      // Verify session is for teacher's class
      if (session.sessionType === "CLASS") {
        const sessionClass = await prisma.sessionClass.findFirst({
          where: {
            sessionId: sessionId,
            classId: teacher.classId,
          },
        });

        if (!sessionClass) {
          return NextResponse.json(
            { error: "You don't have permission to mark attendance for this session" },
            { status: 403 }
          );
        }
      }

      finalClassId = teacher.classId;
    }

    // Check if student has checked in (for CHAPEL sessions only)
    if (session.sessionType === "CHAPEL") {
      const checkIns = await prisma.checkIn.findMany({
        where: {
          studentId: studentId,
          weekendId: session.weekendId,
        },
      });

      if (checkIns.length === 0) {
        return NextResponse.json(
          { error: `${student.fullName} has not checked in at the gate this weekend` },
          { status: 400 }
        );
      }
    }

    // Check for existing attendance
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        studentId_sessionId: {
          studentId: studentId,
          sessionId: sessionId,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: `${student.fullName} has already been marked for this session` },
        { status: 400 }
      );
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        sessionId,
        classId: finalClassId || null,
        markedBy: user.name,
      },
      include: {
        student: { include: { course: true } },
        session: { include: { weekend: true } },
        class: { include: { course: true } },
      },
    });

    return NextResponse.json({
      success: true,
      attendance,
    });
  } catch (error: any) {
    console.error("Mark attendance error:", error);

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "This student has already been marked for this session" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
