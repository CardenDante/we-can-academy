import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key";

/**
 * Mobile App Authentication Endpoint
 * POST /api/mobile/auth/login
 * Body: { username: string, password: string }
 * Returns: { token: string, user: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        name: true,
        role: true,
        teacher: {
          include: {
            class: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Only STAFF and TEACHER can access mobile app
    if (user.role !== "STAFF" && user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Access denied. Only staff and teachers can use the mobile app." },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "30d" } // Long expiry for mobile app
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
