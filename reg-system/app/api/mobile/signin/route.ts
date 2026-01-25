import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sign } from "jsonwebtoken";
import { consumeAuthCode } from "@/lib/redis";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key";

/**
 * Handle mobile sign-in with one-time code
 * Sets NextAuth session cookie and redirects to the intended page
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    // Redirect to error page
    return NextResponse.redirect(new URL("/mobile-signin?error=no_code", request.url));
  }

  // Get and verify the one-time code from Redis
  const data = await consumeAuthCode(code);

  if (!data) {
    // Redirect to error page
    return NextResponse.redirect(new URL("/mobile-signin?error=invalid_code", request.url));
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    // Redirect to error page
    return NextResponse.redirect(new URL("/mobile-signin?error=user_not_found", request.url));
  }

  // Create NextAuth session token
  const sessionToken = {
    sub: user.id,
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  // Sign the token with the same secret NextAuth uses
  const signedToken = sign(sessionToken, JWT_SECRET);

  // Set the session cookie
  const isSecure = process.env.NODE_ENV === "production";
  const cookieName = isSecure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const response = NextResponse.redirect(new URL(data.redirect || "/", request.url));

  response.cookies.set(cookieName, signedToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return response;
}
