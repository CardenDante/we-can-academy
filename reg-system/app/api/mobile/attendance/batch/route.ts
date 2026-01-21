import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";

/**
 * Batch Mark Attendance - Optimized for Offline Sync
 * POST /api/mobile/attendance/batch
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   attendances: [
 *     { studentId, sessionId, markedAt, localId }
 *   ]
 * }
 *
 * This endpoint allows marking multiple attendance records in one request,
 * significantly reducing server load during sync operations.
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

    const { attendances } = await request.json();

    if (!attendances || !Array.isArray(attendances)) {
      return NextResponse.json(
        { error: "Attendances array is required" },
        { status: 400 }
      );
    }

    if (attendances.length === 0) {
      return NextResponse.json(
        { success: true, synced: 0, failed: 0, results: [] }
      );
    }

    if (attendances.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 attendance records per batch" },
        { status: 400 }
      );
    }

    // Get teacher info if TEACHER role
    let teacherClass = null;
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

      teacherClass = teacher.class;
    }

    // Process each attendance record
    const results = [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const record of attendances) {
      const { studentId, sessionId, markedAt, localId } = record;

      try {
        // Validate required fields
        if (!studentId || !sessionId) {
          results.push({
            localId,
            success: false,
            error: "Missing studentId or sessionId",
          });
          failedCount++;
          continue;
        }

        // Get student
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            fullName: true,
            courseId: true,
            isExpelled: true,
          },
        });

        if (!student) {
          results.push({
            localId,
            success: false,
            error: "Student not found",
          });
          failedCount++;
          continue;
        }

        // Check if expelled
        if (student.isExpelled) {
          results.push({
            localId,
            success: false,
            error: `${student.fullName} has been expelled`,
          });
          failedCount++;
          continue;
        }

        // Get session
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          include: { weekend: true },
        });

        if (!session) {
          results.push({
            localId,
            success: false,
            error: "Session not found",
          });
          failedCount++;
          continue;
        }

        // For TEACHER: Verify permissions
        let classId = null;
        if (user.role === "TEACHER" && teacherClass) {
          // Verify student is in teacher's course
          if (student.courseId !== teacherClass.courseId) {
            results.push({
              localId,
              success: false,
              error: "Student not in your course",
            });
            failedCount++;
            continue;
          }

          // Verify session is for teacher's class
          if (session.sessionType === "CLASS") {
            const sessionClass = await prisma.sessionClass.findFirst({
              where: {
                sessionId: sessionId,
                classId: teacherClass.id,
              },
            });

            if (!sessionClass) {
              results.push({
                localId,
                success: false,
                error: "Session not assigned to your class",
              });
              failedCount++;
              continue;
            }
          }

          classId = teacherClass.id;
        }

        // For CHAPEL: Check gate check-in
        if (session.sessionType === "CHAPEL") {
          const checkIns = await prisma.checkIn.findMany({
            where: {
              studentId: studentId,
              weekendId: session.weekendId,
              status: "PRESENT",
            },
          });

          if (checkIns.length === 0) {
            results.push({
              localId,
              success: false,
              error: `${student.fullName} has not checked in at gate`,
            });
            failedCount++;
            continue;
          }
        }

        // Check for duplicate
        const existing = await prisma.attendance.findUnique({
          where: {
            studentId_sessionId: {
              studentId,
              sessionId,
            },
          },
        });

        if (existing) {
          // Already marked - consider this success (idempotent)
          results.push({
            localId,
            success: true,
            attendanceId: existing.id,
            duplicate: true,
          });
          syncedCount++;
          continue;
        }

        // Create attendance record
        const attendance = await prisma.attendance.create({
          data: {
            studentId,
            sessionId,
            classId,
            markedBy: user.name,
            markedAt: markedAt ? new Date(markedAt) : new Date(),
          },
        });

        results.push({
          localId,
          success: true,
          attendanceId: attendance.id,
        });
        syncedCount++;
      } catch (error: any) {
        console.error("Batch attendance error:", error);
        results.push({
          localId,
          success: false,
          error: error.message || "Failed to mark attendance",
        });
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      failed: failedCount,
      total: attendances.length,
      results,
    });
  } catch (error) {
    console.error("Batch attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
