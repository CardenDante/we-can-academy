"use server";

import { signIn } from "@/lib/auth";

/**
 * Sign in user using verified mobile code
 * This is called after the one-time code has been verified
 */
export async function signInWithMobileCode(code: string) {
  try {
    // Verify the code with the API
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/mobile/web-auth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || "Authentication failed",
      };
    }

    const data = await response.json();

    if (!data.success || !data.user) {
      return {
        success: false,
        error: "Invalid response from server",
      };
    }

    // Sign in the user using NextAuth with a special mobile token
    // We'll use the credentials provider with a special username format
    const result = await signIn("credentials", {
      username: `__mobile_auth__${data.user.id}`,
      password: code, // Use the code as password (will be verified in auth config)
      redirect: false,
    });

    if (result?.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      redirect: data.redirect,
    };
  } catch (error: any) {
    console.error("Mobile auth error:", error);
    return {
      success: false,
      error: error.message || "Authentication failed",
    };
  }
}
