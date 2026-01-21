import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";

/**
 * Get Weekends for Mobile App
 * GET /api/mobile/weekends
 * Headers: Authorization: Bearer <token>
 * Query params:
 *   - limit (optional): Limit number of results (default 10)
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
    const limit = parseInt(searchParams.get("limit") || "10");

    // Fetch weekends
    const weekends = await prisma.weekend.findMany({
      orderBy: {
        saturdayDate: "desc",
      },
      take: Math.min(limit, 50), // Max 50
      include: {
        _count: {
          select: {
            sessions: true,
            checkIns: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      weekends,
    });
  } catch (error) {
    console.error("Get weekends error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
