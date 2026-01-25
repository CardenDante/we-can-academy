import { NextRequest, NextResponse } from "next/server";

/**
 * Mobile signin callback - redirects to the page that will handle auth
 * The actual signIn must happen in a Server Component (page) to properly set cookies
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const baseUrl = process.env.NEXTAUTH_URL || request.url;

  console.log("[Mobile Signin Callback] Redirecting to auth page with code:", code?.substring(0, 10) + "...");

  if (!code) {
    console.log("[Mobile Signin Callback] No code provided");
    return NextResponse.redirect(new URL("/mobile-signin?error=no_code", baseUrl));
  }

  // Redirect to the page that will handle the actual signIn
  return NextResponse.redirect(new URL(`/mobile-auth-signin?code=${code}`, baseUrl));
}
