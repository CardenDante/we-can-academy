import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, hasRole } from "@/lib/api-auth";
import { getCachedTeacherProfile } from "@/lib/teacher-cache";
import { rateLimitMiddleware } from "@/lib/rate-limit";

type AttendanceRecord = {
  studentId: string;
  sessionId: string;
  markedAt?: string;
  localId: string;
};

type ResultRecord = {
  localId: string;
  success: boolean;
  error?: string;
  attendanceId?: string;
  duplicate?: boolean;
};

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
 * OPTIMIZED: Pre-fetches all data in bulk queries instead of N+1 pattern
 * Previous: ~500 queries for 100 items
 * Now: ~8 queries for 100 items
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

    // Rate limiting for batch operations
    const rateLimitError = await rateLimitMiddleware(request, user.userId, "batch");
    if (rateLimitError) return rateLimitError;

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

    // Get teacher info if TEACHER role (uses Redis cache)
    let teacherClass: {
      id: string;
      courseId: string;
    } | null = null;

    if (user.role === "TEACHER") {
      const teacher = await getCachedTeacherProfile(user.userId);

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      teacherClass = teacher.class;
    }

    // ============================================
    // PHASE 1: Validate and collect IDs
    // ============================================
    const results: ResultRecord[] = [];
    const validRecords: AttendanceRecord[] = [];
    const studentIds = new Set<string>();
    const sessionIds = new Set<string>();

    for (const record of attendances as AttendanceRecord[]) {
      const { studentId, sessionId, localId } = record;

      if (!studentId || !sessionId) {
        results.push({
          localId,
          success: false,
          error: "Missing studentId or sessionId",
        });
        continue;
      }

      validRecords.push(record);
      studentIds.add(studentId);
      sessionIds.add(sessionId);
    }

    // If no valid records, return early
    if (validRecords.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        failed: results.length,
        total: attendances.length,
        results,
      });
    }

    // ============================================
    // PHASE 2: Bulk fetch all required data
    // ============================================

    // Query 1: Fetch all students
    const students = await prisma.student.findMany({
      where: { id: { in: [...studentIds] } },
      select: {
        id: true,
        fullName: true,
        courseId: true,
        isExpelled: true,
      },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    // Query 2: Fetch all sessions with weekend info
    const sessions = await prisma.session.findMany({
      where: { id: { in: [...sessionIds] } },
      select: {
        id: true,
        sessionType: true,
        weekendId: true,
      },
    });
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    // Query 3: For teachers with CLASS sessions, fetch session classes
    let sessionClassMap = new Map<string, boolean>();
    if (teacherClass) {
      const classSessions = sessions.filter((s) => s.sessionType === "CLASS");
      if (classSessions.length > 0) {
        const sessionClasses = await prisma.sessionClass.findMany({
          where: {
            sessionId: { in: classSessions.map((s) => s.id) },
            classId: teacherClass.id,
          },
          select: { sessionId: true },
        });
        sessionClassMap = new Map(sessionClasses.map((sc) => [sc.sessionId, true]));
      }
    }

    // Query 4: For CHAPEL sessions, fetch check-ins for all students
    const chapelSessions = sessions.filter((s) => s.sessionType === "CHAPEL");
    let checkInMap = new Map<string, boolean>();
    if (chapelSessions.length > 0) {
      const weekendIds = [...new Set(chapelSessions.map((s) => s.weekendId))];
      const checkIns = await prisma.checkIn.findMany({
        where: {
          studentId: { in: [...studentIds] },
          weekendId: { in: weekendIds },
          status: "PRESENT",
        },
        select: {
          studentId: true,
          weekendId: true,
        },
      });
      // Key: "studentId-weekendId" -> has checked in
      checkInMap = new Map(checkIns.map((c) => [`${c.studentId}-${c.weekendId}`, true]));
    }

    // Query 5: Fetch all existing attendances
    const attendanceKeys = validRecords.map((r) => ({
      studentId: r.studentId,
      sessionId: r.sessionId,
    }));
    const existingAttendances = await prisma.attendance.findMany({
      where: {
        OR: attendanceKeys,
      },
      select: {
        id: true,
        studentId: true,
        sessionId: true,
      },
    });
    const existingMap = new Map(
      existingAttendances.map((a) => [`${a.studentId}-${a.sessionId}`, a])
    );

    // ============================================
    // PHASE 3: Process records
    // ============================================
    const toCreate: Array<{
      localId: string;
      data: {
        studentId: string;
        sessionId: string;
        classId: string | null;
        markedBy: string;
        markedAt: Date;
      };
    }> = [];

    for (const record of validRecords) {
      const { studentId, sessionId, markedAt, localId } = record;

      // Check student exists
      const student = studentMap.get(studentId);
      if (!student) {
        results.push({
          localId,
          success: false,
          error: "Student not found",
        });
        continue;
      }

      // Check if expelled
      if (student.isExpelled) {
        results.push({
          localId,
          success: false,
          error: `${student.fullName} has been expelled`,
        });
        continue;
      }

      // Check session exists
      const session = sessionMap.get(sessionId);
      if (!session) {
        results.push({
          localId,
          success: false,
          error: "Session not found",
        });
        continue;
      }

      // For TEACHER: Verify permissions
      let classId: string | null = null;
      if (user.role === "TEACHER" && teacherClass) {
        // Verify student is in teacher's course
        if (student.courseId !== teacherClass.courseId) {
          results.push({
            localId,
            success: false,
            error: "Student not in your course",
          });
          continue;
        }

        // Verify session is for teacher's class
        if (session.sessionType === "CLASS") {
          if (!sessionClassMap.has(sessionId)) {
            results.push({
              localId,
              success: false,
              error: "Session not assigned to your class",
            });
            continue;
          }
        }

        classId = teacherClass.id;
      }

      // For CHAPEL: Check gate check-in
      if (session.sessionType === "CHAPEL") {
        const checkInKey = `${studentId}-${session.weekendId}`;
        if (!checkInMap.has(checkInKey)) {
          results.push({
            localId,
            success: false,
            error: `${student.fullName} has not checked in at gate`,
          });
          continue;
        }
      }

      // Check for existing attendance
      const existingKey = `${studentId}-${sessionId}`;
      const existing = existingMap.get(existingKey);
      if (existing) {
        results.push({
          localId,
          success: true,
          attendanceId: existing.id,
          duplicate: true,
        });
        continue;
      }

      // Queue for creation
      toCreate.push({
        localId,
        data: {
          studentId,
          sessionId,
          classId,
          markedBy: user.name,
          markedAt: markedAt ? new Date(markedAt) : new Date(),
        },
      });
    }

    // ============================================
    // PHASE 4: Batch create attendances in transaction
    // ============================================
    if (toCreate.length > 0) {
      const createdAttendances = await prisma.$transaction(
        toCreate.map((item) =>
          prisma.attendance.create({
            data: item.data,
            select: { id: true },
          })
        )
      );

      // Map results
      for (let i = 0; i < toCreate.length; i++) {
        results.push({
          localId: toCreate[i].localId,
          success: true,
          attendanceId: createdAttendances[i].id,
        });
      }
    }

    // Count results
    const syncedCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

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
