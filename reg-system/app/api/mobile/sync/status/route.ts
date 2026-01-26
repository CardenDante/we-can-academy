import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";
import { getDayOfWeek, getWeekendSaturdayDate, isWeekend } from "@/lib/date-utils";

/**
 * Get Sync Status and Latest Data Timestamps
 * GET /api/mobile/sync/status
 * Headers: Authorization: Bearer <token>
 *
 * Returns timestamps of latest data to help mobile app
 * determine what needs to be synced/updated
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

    // Get latest timestamps for different data types
    const [
      latestWeekend,
      latestSession,
      latestStudent,
      latestAttendance,
      latestCheckIn,
    ] = await Promise.all([
      // Latest weekend
      prisma.weekend.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),

      // Latest session
      prisma.session.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),

      // Latest student update
      prisma.student.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),

      // Latest attendance (for this user)
      user.role === "TEACHER"
        ? prisma.teacher.findUnique({
            where: { userId: user.userId },
          }).then(async (teacher) => {
            if (!teacher) return null;
            return prisma.attendance.findFirst({
              where: { classId: teacher.classId },
              orderBy: { markedAt: "desc" },
              select: { markedAt: true },
            });
          })
        : prisma.attendance.findFirst({
            orderBy: { markedAt: "desc" },
            select: { markedAt: true },
          }),

      // Latest check-in (STAFF only)
      user.role === "STAFF"
        ? prisma.checkIn.findFirst({
            orderBy: { checkedAt: "desc" },
            select: { checkedAt: true },
          })
        : null,
    ]);

    // Get current weekend using date utility for testing support
    let currentWeekend = null;
    if (isWeekend()) {
      const saturdayDate = getWeekendSaturdayDate();
      currentWeekend = await prisma.weekend.findUnique({
        where: { saturdayDate },
        select: {
          id: true,
          name: true,
          saturdayDate: true,
        },
      });
    }

    // Get pending sync counts (for info)
    const stats = {
      totalStudents: await prisma.student.count({
        where: { isExpelled: false },
      }),
      totalSessions: await prisma.session.count(),
      totalWeekends: await prisma.weekend.count(),
    };

    // For teachers, get course-specific stats
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

      if (teacher) {
        stats.totalStudents = await prisma.student.count({
          where: {
            courseId: teacher.class.courseId,
            isExpelled: false,
          },
        });

        stats.totalSessions = await prisma.session.count({
          where: {
            sessionType: "CLASS",
            sessionClasses: {
              some: {
                classId: teacher.classId,
              },
            },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      serverTime: new Date().toISOString(),
      currentWeekend,
      lastUpdated: {
        weekends: latestWeekend?.updatedAt || null,
        sessions: latestSession?.updatedAt || null,
        students: latestStudent?.updatedAt || null,
        attendance: latestAttendance?.markedAt || null,
        checkIns: latestCheckIn?.checkedAt || null,
      },
      stats,
      user: {
        id: user.userId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Sync status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
