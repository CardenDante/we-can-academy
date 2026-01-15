import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Allow static files, Next.js internals, and public assets
      if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.includes(".")  // Allow files with extensions (CSS, JS, images, etc.)
      ) {
        return true;
      }

      // Public routes
      if (pathname === "/login" || pathname === "/unauthorized") {
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

      // Debug logging
      console.log(`[Auth] User: ${auth.user?.name}, Role: ${role}, Path: ${pathname}`);

      if (pathname.startsWith("/admin") && role !== "ADMIN") {
        console.log(`[Auth] Access denied to /admin - Role is ${role}, expected ADMIN`);
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
