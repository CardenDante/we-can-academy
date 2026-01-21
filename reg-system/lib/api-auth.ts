import { NextRequest } from "next/server";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key";

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: string;
  name: string;
}

/**
 * Verify JWT token from mobile app request
 */
export async function verifyMobileToken(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const decoded = verify(token, JWT_SECRET) as AuthenticatedUser;

    return decoded;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthenticatedUser, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}
