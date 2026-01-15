import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes
      if (pathname === "/login" || pathname.startsWith("/api/auth")) {
        if (isLoggedIn && pathname === "/login") {
          // Redirect to appropriate dashboard if already logged in
          const role = (auth.user as any).role;
          return Response.redirect(new URL(getRoleHomePage(role), nextUrl));
        }
        return true;
      }

      // Protected routes - require authentication
      if (!isLoggedIn) {
        return false; // Redirect to login page
      }

      // Role-based access control
      const role = (auth.user as any).role;

      if (pathname.startsWith("/admin") && role !== "ADMIN") {
        return Response.redirect(new URL("/unauthorized", nextUrl));
      }

      if (pathname.startsWith("/cashier") && role !== "CASHIER" && role !== "ADMIN") {
        return Response.redirect(new URL("/unauthorized", nextUrl));
      }

      if (pathname.startsWith("/staff") && role !== "STAFF" && role !== "ADMIN") {
        return Response.redirect(new URL("/unauthorized", nextUrl));
      }

      if (pathname.startsWith("/security") && role !== "SECURITY" && role !== "ADMIN") {
        return Response.redirect(new URL("/unauthorized", nextUrl));
      }

      return true;
    },
  },
  providers: [], // Add providers with an empty array for type safety
} satisfies NextAuthConfig;

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
