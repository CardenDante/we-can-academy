import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";

/**
 * Get Chapel Attendance Statistics
 * GET /api/mobile/chapel/stats
 * Headers: Authorization: Bearer <token>
 * Query params:
 *   - weekendId (optional): Filter by specific weekend (defaults to current/latest)
 *
 * Returns chapel attendance statistics including:
 * - Attendance by course
 * - Check-in vs attendance comparison
 * - Students who checked in but didn't attend chapel
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

    // Only STAFF can view chapel stats
    if (!hasRole(user, ["STAFF"])) {
      return NextResponse.json(
        { error: "Only staff members can view chapel statistics" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const weekendId = searchParams.get("weekendId");

    let targetWeekendId = weekendId;

    // If no weekendId provided, get current or latest weekend
    if (!targetWeekendId) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let saturdayDate: Date;
      if (dayOfWeek === 6) {
        saturdayDate = today;
      } else if (dayOfWeek === 0) {
        saturdayDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      } else {
        const daysToSubtract = dayOfWeek === 0 ? 1 : dayOfWeek + 1;
        saturdayDate = new Date(today.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
      }

      const currentWeekend = await prisma.weekend.findUnique({
        where: { saturdayDate },
        select: { id: true },
      });

      if (currentWeekend) {
        targetWeekendId = currentWeekend.id;
      } else {
        const latestWeekend = await prisma.weekend.findFirst({
          orderBy: { saturdayDate: "desc" },
          select: { id: true },
        });

        if (!latestWeekend) {
          return NextResponse.json({
            success: true,
            stats: null,
            message: "No weekend found",
          });
        }

        targetWeekendId = latestWeekend.id;
      }
    }

    // Get weekend details
    const weekend = await prisma.weekend.findUnique({
      where: { id: targetWeekendId },
      select: {
        id: true,
        name: true,
        saturdayDate: true,
        isCompleted: true,
      },
    });

    if (!weekend) {
      return NextResponse.json(
        { error: "Weekend not found" },
        { status: 404 }
      );
    }

    // Fetch all data in parallel for performance
    const [
      totalStudents,
      chapelSessions,
      checkInStats,
      attendanceByCourse,
      checkInsByCourse,
    ] = await Promise.all([
      // Total non-expelled students
      prisma.student.count({
        where: { isExpelled: false },
      }),

      // Chapel sessions for this weekend with attendance count
      prisma.session.findMany({
        where: {
          weekendId: targetWeekendId,
          sessionType: "CHAPEL",
        },
        select: {
          id: true,
          name: true,
          day: true,
          _count: {
            select: { attendances: true },
          },
        },
      }),

      // Check-in stats (unique students who checked in)
      prisma.checkIn.groupBy({
        by: ["day"],
        where: {
          weekendId: targetWeekendId,
          status: "PRESENT",
        },
        _count: {
          studentId: true,
        },
      }),

      // Chapel attendance by course (using raw query for efficiency)
      prisma.$queryRaw<Array<{ courseId: string; courseName: string; count: bigint }>>`
        SELECT c.id as "courseId", c.name as "courseName", COUNT(DISTINCT a."studentId") as count
        FROM "Attendance" a
        JOIN "Session" s ON a."sessionId" = s.id
        JOIN "Student" st ON a."studentId" = st.id
        JOIN "Course" c ON st."courseId" = c.id
        WHERE s."weekendId" = ${targetWeekendId}
          AND s."sessionType" = 'CHAPEL'
        GROUP BY c.id, c.name
        ORDER BY c.name
      `,

      // Check-ins by course
      prisma.$queryRaw<Array<{ courseId: string; courseName: string; count: bigint }>>`
        SELECT c.id as "courseId", c.name as "courseName", COUNT(DISTINCT ci."studentId") as count
        FROM "CheckIn" ci
        JOIN "Student" st ON ci."studentId" = st.id
        JOIN "Course" c ON st."courseId" = c.id
        WHERE ci."weekendId" = ${targetWeekendId}
          AND ci.status = 'PRESENT'
        GROUP BY c.id, c.name
        ORDER BY c.name
      `,
    ]);

    // Calculate students who checked in but didn't attend chapel
    const checkedInStudentIds = await prisma.checkIn.findMany({
      where: {
        weekendId: targetWeekendId,
        status: "PRESENT",
      },
      select: { studentId: true },
      distinct: ["studentId"],
    });

    const chapelSessionIds = chapelSessions.map((s) => s.id);
    const attendedStudentIds = chapelSessionIds.length > 0
      ? await prisma.attendance.findMany({
          where: {
            sessionId: { in: chapelSessionIds },
          },
          select: { studentId: true },
          distinct: ["studentId"],
        })
      : [];

    const attendedSet = new Set(attendedStudentIds.map((a) => a.studentId));
    const missedChapelCount = checkedInStudentIds.filter(
      (c) => !attendedSet.has(c.studentId)
    ).length;

    // Format check-in stats
    const checkInsByDay = {
      SATURDAY: checkInStats.find((s) => s.day === "SATURDAY")?._count.studentId || 0,
      SUNDAY: checkInStats.find((s) => s.day === "SUNDAY")?._count.studentId || 0,
    };

    // Format chapel session stats
    const sessionStats = chapelSessions.map((s) => ({
      id: s.id,
      name: s.name,
      day: s.day,
      attendanceCount: s._count.attendances,
      attendancePercentage: totalStudents > 0
        ? Math.round((s._count.attendances / totalStudents) * 100)
        : 0,
    }));

    // Format course stats
    const courseStats = attendanceByCourse.map((a) => {
      const checkInData = checkInsByCourse.find((c) => c.courseId === a.courseId);
      const checkInCount = checkInData ? Number(checkInData.count) : 0;
      const attendanceCount = Number(a.count);

      return {
        courseId: a.courseId,
        courseName: a.courseName,
        checkedIn: checkInCount,
        attendedChapel: attendanceCount,
        missedChapel: checkInCount - attendanceCount,
        attendanceRate: checkInCount > 0
          ? Math.round((attendanceCount / checkInCount) * 100)
          : 0,
      };
    });

    // Total attendance across all chapel sessions (unique students)
    const totalChapelAttendance = attendedStudentIds.length;

    return NextResponse.json({
      success: true,
      weekend,
      stats: {
        totalStudents,
        checkIns: {
          saturday: checkInsByDay.SATURDAY,
          sunday: checkInsByDay.SUNDAY,
          total: checkedInStudentIds.length,
        },
        chapelAttendance: {
          total: totalChapelAttendance,
          percentage: checkedInStudentIds.length > 0
            ? Math.round((totalChapelAttendance / checkedInStudentIds.length) * 100)
            : 0,
          missedCount: missedChapelCount,
        },
        sessions: sessionStats,
        byCourse: courseStats,
      },
    });
  } catch (error) {
    console.error("Get chapel stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
