import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { storeAuthCode } from "@/lib/redis";
import crypto from "crypto";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key";

/**
 * Exchange mobile JWT token for a one-time code
 * This endpoint allows mobile app users to seamlessly access web pages
 * by converting their mobile JWT token into a temporary code that can be
 * used to create a NextAuth session
 *
 * Flow:
 * 1. Mobile app calls: GET /api/mobile/web-auth?token=<JWT>&redirect=<URL>
 * 2. API verifies token, stores code in Redis, and returns one-time code
 * 3. Mobile app opens: /mobile-signin?code=<CODE>
 * 4. Web page verifies code from Redis and creates NextAuth session
 * 5. Redirects to target URL
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const redirectUrl = searchParams.get("redirect") || "/";

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify the mobile JWT token
    let decoded: any;
    try {
      decoded = verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get user from database to verify they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate one-time code (valid for 2 minutes via Redis TTL)
    const code = crypto.randomBytes(32).toString("hex");

    // Store in Redis with 2-minute expiration
    await storeAuthCode(code, {
      userId: user.id,
      redirect: redirectUrl,
    });

    return NextResponse.json({
      success: true,
      code,
      signinUrl: `/mobile-signin?code=${code}`,
    });
  } catch (error) {
    console.error("Web auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
