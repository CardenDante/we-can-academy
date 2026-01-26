import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";

/**
 * Get Chapel Sessions
 * GET /api/mobile/chapel/sessions
 * Headers: Authorization: Bearer <token>
 * Query params:
 *   - weekendId (optional): Filter by specific weekend (defaults to current/latest)
 *
 * Returns chapel sessions with attendance counts.
 * Only STAFF can access chapel sessions.
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

    // Only STAFF can access chapel sessions
    if (!hasRole(user, ["STAFF"])) {
      return NextResponse.json(
        { error: "Only staff members can access chapel sessions" },
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

      // Calculate Saturday date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let saturdayDate: Date;
      if (dayOfWeek === 6) {
        // Saturday
        saturdayDate = today;
      } else if (dayOfWeek === 0) {
        // Sunday - look for yesterday's Saturday
        saturdayDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      } else {
        // Weekday - find the most recent Saturday
        const daysToSubtract = dayOfWeek === 0 ? 1 : dayOfWeek + 1;
        saturdayDate = new Date(today.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
      }

      // Try to find current weekend first
      const currentWeekend = await prisma.weekend.findUnique({
        where: { saturdayDate },
        select: { id: true },
      });

      if (currentWeekend) {
        targetWeekendId = currentWeekend.id;
      } else {
        // Fallback to latest weekend
        const latestWeekend = await prisma.weekend.findFirst({
          orderBy: { saturdayDate: "desc" },
          select: { id: true },
        });

        if (!latestWeekend) {
          return NextResponse.json({
            success: true,
            sessions: [],
            weekend: null,
          });
        }

        targetWeekendId = latestWeekend.id;
      }
    }

    // Fetch chapel sessions with attendance counts
    const [sessions, weekend, totalStudents] = await Promise.all([
      prisma.session.findMany({
        where: {
          weekendId: targetWeekendId,
          sessionType: "CHAPEL",
        },
        select: {
          id: true,
          name: true,
          day: true,
          startTime: true,
          endTime: true,
          _count: {
            select: {
              attendances: true,
            },
          },
        },
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
      }),
      prisma.weekend.findUnique({
        where: { id: targetWeekendId },
        select: {
          id: true,
          name: true,
          saturdayDate: true,
          isCompleted: true,
        },
      }),
      // Get total non-expelled students for attendance percentage calculation
      prisma.student.count({
        where: { isExpelled: false },
      }),
    ]);

    // Transform sessions with attendance percentage
    const sessionsWithStats = sessions.map((session) => ({
      id: session.id,
      name: session.name,
      day: session.day,
      startTime: session.startTime,
      endTime: session.endTime,
      attendanceCount: session._count.attendances,
      totalStudents,
      attendancePercentage: totalStudents > 0
        ? Math.round((session._count.attendances / totalStudents) * 100)
        : 0,
    }));

    return NextResponse.json({
      success: true,
      sessions: sessionsWithStats,
      weekend,
      totalStudents,
    });
  } catch (error) {
    console.error("Get chapel sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
