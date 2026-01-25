import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { sign } from "jsonwebtoken";
import { consumeAuthCode } from "@/lib/redis";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key";

export default async function MobileSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = params.code;

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">No authentication code provided</p>
        </div>
      </div>
    );
  }

  // Get and verify the one-time code from Redis
  // This also deletes the code (one-time use)
  const data = await consumeAuthCode(code);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">Invalid or expired code</p>
        </div>
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">User not found</p>
        </div>
      </div>
    );
  }

  // Create NextAuth session token
  // This matches the structure used by NextAuth's JWT callback in lib/auth.ts
  const sessionToken = {
    sub: user.id, // Standard JWT claim for user ID
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  // Sign the token with the same secret NextAuth uses
  const signedToken = sign(sessionToken, JWT_SECRET);

  // Set the session cookie (same format as NextAuth)
  const cookieStore = await cookies();
  const isSecure = process.env.NODE_ENV === "production";
  const cookieName = isSecure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  cookieStore.set(cookieName, signedToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // Redirect to the intended page
  redirect(data.redirect || "/");
}
