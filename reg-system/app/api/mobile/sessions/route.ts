import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";

/**
 * Get Sessions for Mobile App
 * GET /api/mobile/sessions
 * Headers: Authorization: Bearer <token>
 * Query params:
 *   - weekendId (optional): Filter by weekend
 *   - sessionType (optional): CHAPEL or CLASS
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
    const weekendId = searchParams.get("weekendId");
    const sessionType = searchParams.get("sessionType");

    // Build query
    const where: any = {};

    if (weekendId) {
      where.weekendId = weekendId;
    }

    if (sessionType) {
      where.sessionType = sessionType;
    }

    // For teachers, only show their class sessions
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

      where.sessionType = "CLASS";
      where.sessionClasses = {
        some: {
          classId: teacher.classId,
        },
      };
    }

    // Fetch sessions
    const sessions = await prisma.session.findMany({
      where,
      include: {
        weekend: true,
        sessionClasses: {
          include: {
            class: {
              include: {
                course: true,
              },
            },
          },
        },
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: [
        { weekend: { saturdayDate: "desc" } },
        { day: "asc" },
        { startTime: "asc" },
      ],
      take: 50, // Limit results for mobile
    });

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
