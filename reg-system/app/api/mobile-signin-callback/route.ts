import { NextRequest, NextResponse } from "next/server";
import { consumeAuthCode } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { sign } from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const baseUrl = process.env.NEXTAUTH_URL || request.url;

  console.log("[Mobile Signin] Callback started with code:", code?.substring(0, 10) + "...");

  if (!code) {
    console.log("[Mobile Signin] No code provided, redirecting to error");
    return NextResponse.redirect(new URL("/mobile-signin?error=no_code", baseUrl));
  }

  // Get and verify the one-time code from Redis
  let data;
  try {
    console.log("[Mobile Signin] Attempting to consume auth code from Redis");
    data = await consumeAuthCode(code);
    console.log("[Mobile Signin] Auth code consumed successfully:", {
      userId: data?.userId,
      redirect: data?.redirect,
    });
  } catch (error) {
    console.error("[Mobile Signin] Redis error:", error);
    return NextResponse.redirect(new URL("/mobile-signin?error=server_error", baseUrl));
  }

  if (!data) {
    console.log("[Mobile Signin] Invalid or expired code");
    return NextResponse.redirect(new URL("/mobile-signin?error=invalid_code", baseUrl));
  }

  // Get user from database
  let user;
  try {
    console.log("[Mobile Signin] Fetching user from database, userId:", data.userId);
    user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
    });
    console.log("[Mobile Signin] User found:", {
      id: user?.id,
      username: user?.username,
      role: user?.role,
    });
  } catch (error) {
    console.error("[Mobile Signin] Database error:", error);
    return NextResponse.redirect(new URL("/mobile-signin?error=server_error", baseUrl));
  }

  if (!user) {
    console.log("[Mobile Signin] User not found in database");
    return NextResponse.redirect(new URL("/mobile-signin?error=user_not_found", baseUrl));
  }

  // Create NextAuth-compatible session token
  const sessionToken = {
    sub: user.id,
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  console.log("[Mobile Signin] Created session token for user:", user.username);

  // Sign the token
  let signedToken;
  try {
    signedToken = sign(sessionToken, JWT_SECRET);
    console.log("[Mobile Signin] JWT token signed successfully");
  } catch (error) {
    console.error("[Mobile Signin] JWT signing error:", error);
    return NextResponse.redirect(new URL("/mobile-signin?error=server_error", baseUrl));
  }

  // Create redirect response
  const redirectUrl = data.redirect || "/";
  console.log("[Mobile Signin] Creating redirect response to:", redirectUrl);
  const response = NextResponse.redirect(new URL(redirectUrl, baseUrl));

  // Set the session cookie
  const isSecure = process.env.NODE_ENV === "production";
  const cookieName = isSecure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  console.log("[Mobile Signin] Setting cookie:", {
    name: cookieName,
    isSecure,
    env: process.env.NODE_ENV,
  });

  response.cookies.set(cookieName, signedToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  console.log("[Mobile Signin] Cookie set successfully, redirecting");
  return response;
}
