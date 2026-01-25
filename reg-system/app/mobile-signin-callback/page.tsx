import { redirect } from "next/navigation";
import { consumeAuthCode } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { sign } from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key";

export default async function MobileSigninCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const { code } = params;

  if (!code) {
    redirect("/mobile-signin?error=no_code");
  }

  try {
    // Get and verify the one-time code from Redis
    const data = await consumeAuthCode(code);

    if (!data) {
      redirect("/mobile-signin?error=invalid_code");
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
      redirect("/mobile-signin?error=user_not_found");
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

    // Sign the token
    const signedToken = sign(sessionToken, JWT_SECRET);

    // Set the session cookie
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
  } catch (error) {
    console.error("Mobile signin callback error:", error);
    redirect("/mobile-signin?error=server_error");
  }
}
