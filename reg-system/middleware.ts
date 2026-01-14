import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user as any;

  // Public routes
  if (pathname === "/login" || pathname === "/api/auth/signin" || pathname === "/api/auth/callback/credentials") {
    if (user) {
      // Redirect to appropriate dashboard if already logged in
      return NextResponse.redirect(new URL(getRoleHomePage(user.role), req.url));
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Role-based access control
  if (pathname.startsWith("/admin") && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/cashier") && user.role !== "CASHIER" && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/staff") && user.role !== "STAFF" && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/security") && user.role !== "SECURITY" && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
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
    default:
      return "/login";
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
