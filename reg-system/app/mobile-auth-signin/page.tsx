import { redirect } from "next/navigation";
import { consumeAuthCode } from "@/lib/redis";
import { signIn } from "@/lib/auth";

export default async function MobileAuthSigninPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const { code } = params;

  console.log("[Mobile Auth Signin] Page loaded with code:", code?.substring(0, 10) + "...");

  if (!code) {
    redirect("/mobile-signin?error=no_code");
  }

  // Get and verify the one-time code from Redis
  let data;
  try {
    console.log("[Mobile Auth Signin] Consuming auth code from Redis");
    data = await consumeAuthCode(code);
    console.log("[Mobile Auth Signin] Auth code consumed:", {
      userId: data?.userId,
      redirect: data?.redirect,
    });
  } catch (error) {
    console.error("[Mobile Auth Signin] Redis error:", error);
    redirect("/mobile-signin?error=server_error");
  }

  if (!data) {
    console.log("[Mobile Auth Signin] Invalid or expired code");
    redirect("/mobile-signin?error=invalid_code");
  }

  // Use NextAuth's signIn with the mobile provider
  // This will properly set cookies since it's in a Server Component
  try {
    console.log("[Mobile Auth Signin] Calling signIn with mobile provider for userId:", data.userId);

    await signIn("mobile", {
      userId: data.userId,
      redirectTo: data.redirect || "/",
    });

    console.log("[Mobile Auth Signin] SignIn completed successfully");

  } catch (error) {
    console.error("[Mobile Auth Signin] SignIn error:", error);
    redirect("/mobile-signin?error=auth_failed");
  }
}
