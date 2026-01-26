import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";
import { getCachedTeacherProfile } from "@/lib/teacher-cache";
import { cachedListResponse } from "@/lib/api-cache";
import { SessionType, Prisma } from "@prisma/client";

/**
 * Get Sessions for Mobile App
 * GET /api/mobile/sessions
 * Headers: Authorization: Bearer <token>
 * Query params:
 *   - weekendId (optional): Filter by weekend
 *   - sessionType (optional): CHAPEL or CLASS
 *
 * OPTIMIZED: Uses cached teacher profile, minimal payload, response caching
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
    const where: Prisma.SessionWhereInput = {};

    if (weekendId) {
      where.weekendId = weekendId;
    }

    if (sessionType && (sessionType === "CLASS" || sessionType === "CHAPEL")) {
      where.sessionType = sessionType as SessionType;
    }

    // For teachers, only show their class sessions (use cached profile)
    if (user.role === "TEACHER") {
      const teacher = await getCachedTeacherProfile(user.userId);

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      if (teacher.class) {
        where.sessionType = SessionType.CLASS;
        where.sessionClasses = {
          some: {
            classId: teacher.class.id,
          },
        };
      }
    }

    // Fetch sessions with minimal data for mobile
    const sessions = await prisma.session.findMany({
      where,
      select: {
        id: true,
        name: true,
        sessionType: true,
        day: true,
        startTime: true,
        endTime: true,
        weekend: {
          select: {
            id: true,
            name: true,
            saturdayDate: true,
          },
        },
        sessionClasses: {
          select: {
            id: true,
            class: {
              select: {
                id: true,
                name: true,
                course: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
      take: 50,
    });

    // Return with cache headers (30 second cache)
    return cachedListResponse({
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
