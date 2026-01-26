import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";
import { getCachedTeacherProfile } from "@/lib/teacher-cache";

/**
 * Get Attendance for a Session
 * GET /api/mobile/attendance?sessionId=xxx
 * Headers: Authorization: Bearer <token>
 *
 * OPTIMIZED: Uses Redis-cached teacher profile
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
    const where: { sessionId: string; classId?: string } = { sessionId };

    // For teachers, only show their class attendance (use cached profile)
    if (user.role === "TEACHER") {
      const teacher = await getCachedTeacherProfile(user.userId);

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      if (teacher.class) {
        where.classId = teacher.class.id;
      }
    }

    // Fetch attendance records with minimal includes
    const attendances = await prisma.attendance.findMany({
      where,
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
        session: {
          select: {
            id: true,
            sessionType: true,
            day: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
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
 *
 * OPTIMIZED: Uses parallel queries and Redis-cached teacher profile
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

    // OPTIMIZATION: Fetch student, session, and teacher (if applicable) in parallel
    const [student, session, teacher] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          fullName: true,
          admissionNumber: true,
          isExpelled: true,
          courseId: true,
        },
      }),
      prisma.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          sessionType: true,
          weekendId: true,
          day: true,
        },
      }),
      user.role === "TEACHER" ? getCachedTeacherProfile(user.userId) : null,
    ]);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

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
      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      if (!teacher.class) {
        return NextResponse.json(
          { error: "Teacher has no assigned class" },
          { status: 403 }
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
            classId: teacher.class.id,
          },
          select: { id: true },
        });

        if (!sessionClass) {
          return NextResponse.json(
            { error: "You don't have permission to mark attendance for this session" },
            { status: 403 }
          );
        }
      }

      finalClassId = teacher.class.id;
    }

    // Check if student has checked in (for CHAPEL sessions only)
    if (session.sessionType === "CHAPEL") {
      const checkInCount = await prisma.checkIn.count({
        where: {
          studentId: studentId,
          weekendId: session.weekendId,
          status: "PRESENT",
        },
      });

      if (checkInCount === 0) {
        return NextResponse.json(
          { error: `${student.fullName} has not checked in at the gate this weekend` },
          { status: 400 }
        );
      }
    }

    // OPTIMIZATION: Use upsert to handle concurrent marking
    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_sessionId: {
          studentId: studentId,
          sessionId: sessionId,
        },
      },
      update: {}, // Don't update if exists
      create: {
        studentId,
        sessionId,
        classId: finalClassId || null,
        markedBy: user.name,
      },
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
        session: {
          select: {
            id: true,
            sessionType: true,
            day: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Check if this was an existing record (markedAt will be older than a few seconds ago)
    const isExisting = attendance.markedAt < new Date(Date.now() - 5000);

    if (isExisting) {
      return NextResponse.json(
        { error: `${student.fullName} has already been marked for this session` },
        { status: 400 }
      );
    }

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
