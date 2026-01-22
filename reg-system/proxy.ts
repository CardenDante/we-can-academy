import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, Next.js internals, and public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Public routes
  if (pathname === "/login" || pathname === "/unauthorized") {
    const session = (request as any).auth;

    // If logged in and trying to access login, redirect to role home
    if (session?.user && pathname === "/login") {
      const role = (session.user as any).role;
      const homeUrl = getRoleHomePage(role);
      return NextResponse.redirect(new URL(homeUrl, request.url));
    }

    return NextResponse.next();
  }

  // Protected routes - require authentication
  const session = (request as any).auth;

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based access control
  const role = (session.user as any).role;

  console.log(`[Middleware] User: ${session.user.name}, Role: ${role}, Path: ${pathname}`);

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    console.log(`[Middleware] Access denied to /admin - Role is ${role}, expected ADMIN`);
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (pathname.startsWith("/cashier") && role !== "CASHIER" && role !== "ADMIN") {
    console.log(`[Middleware] Access denied to /cashier - Role is ${role}`);
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (pathname.startsWith("/staff") && role !== "STAFF" && role !== "ADMIN") {
    console.log(`[Middleware] Access denied to /staff - Role is ${role}`);
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (pathname.startsWith("/security") && role !== "SECURITY" && role !== "ADMIN") {
    console.log(`[Middleware] Access denied to /security - Role is ${role}`);
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (pathname.startsWith("/teacher") && role !== "TEACHER" && role !== "ADMIN") {
    console.log(`[Middleware] Access denied to /teacher - Role is ${role}`);
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
});

function getRoleHomePage(role: string) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CASHIER":
      return "/cashier";
    case "STAFF":
      return "/staff";
    case "SECURITY":
      return "/security";
    case "TEACHER":
      return "/teacher";
    default:
      return "/login";
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)$",
  ],
};
