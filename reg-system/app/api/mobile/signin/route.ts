import { NextRequest, NextResponse } from "next/server";

/**
 * Handle mobile sign-in with one-time code
 * Redirects to callback API route which will set the session cookie
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  // Use NEXTAUTH_URL as the base URL for all redirects
  const baseUrl = process.env.NEXTAUTH_URL || request.url;

  if (!code) {
    // Redirect to error page
    return NextResponse.redirect(new URL("/mobile-signin?error=no_code", baseUrl));
  }

  // Redirect to callback API route which will handle authentication
  return NextResponse.redirect(new URL(`/api/mobile-signin-callback?code=${code}`, baseUrl));
}
