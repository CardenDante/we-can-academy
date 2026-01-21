import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";

/**
 * Get Students for Mobile App
 * GET /api/mobile/students
 * Headers: Authorization: Bearer <token>
 * Query params:
 *   - search (optional): Search by name or admission number
 *   - classId (optional): Filter by class
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyMobileToken(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only STAFF and TEACHER can access
    if (!hasRole(user, ["STAFF", "TEACHER"])) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const classId = searchParams.get("classId");

    // Build query
    const where: any = {
      isExpelled: false, // Only active students
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { admissionNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // For teachers, only show students in their COURSE
    if (user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.userId },
        include: {
          class: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      where.courseId = teacher.class.courseId;
    }

    // Fetch students
    const students = await prisma.student.findMany({
      where,
      include: {
        course: true,
      },
      orderBy: {
        fullName: "asc",
      },
      take: 100, // Limit for mobile
    });

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (error) {
    console.error("Get students error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get Student by Admission Number
 * GET /api/mobile/students/[admissionNumber]
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyMobileToken(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only STAFF and TEACHER can access
    if (!hasRole(user, ["STAFF", "TEACHER"])) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const { admissionNumber } = await request.json();

    if (!admissionNumber) {
      return NextResponse.json(
        { error: "Admission number is required" },
        { status: 400 }
      );
    }

    // Find student
    const student = await prisma.student.findUnique({
      where: { admissionNumber },
      include: {
        course: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // For teachers, verify student is in their COURSE
    if (user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.userId },
        include: {
          class: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      if (student.courseId !== teacher.class.courseId) {
        return NextResponse.json(
          { error: "Student not in your course" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      student,
    });
  } catch (error) {
    console.error("Get student error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
