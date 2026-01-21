"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markAttendance(data: {
  studentId: string;
  sessionId: string;
  classId?: string;
}) {
  try {
    const currentUser = await getUser();
    if (!currentUser || !["STAFF", "ADMIN", "TEACHER"].includes(currentUser.role)) {
      return {
        success: false,
        error: "You don't have permission to mark attendance. Please contact an administrator."
      };
    }

    // If teacher, verify they own this class
    if (currentUser.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: currentUser.id },
      });

      if (!teacher) {
        return {
          success: false,
          error: "Teacher profile not found. Please contact an administrator."
        };
      }

      // For class sessions, verify the teacher is assigned to this class
      const session = await prisma.session.findUnique({
        where: { id: data.sessionId },
        include: {
          sessionClasses: {
            where: {
              classId: teacher.classId,
            },
          },
        },
      });

      if (!session) {
        return {
          success: false,
          error: "Session not found."
        };
      }

      if (session.sessionType === "CLASS" && session.sessionClasses.length === 0) {
        return {
          success: false,
          error: "You don't have permission to mark attendance for this class."
        };
      }

      // Ensure classId is set for class sessions
      if (session.sessionType === "CLASS") {
        data.classId = teacher.classId;
      }
    }

    // Get the session to determine the date
    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
      include: { weekend: true },
    });

    if (!session) {
      return {
        success: false,
        error: "The selected session was not found. Please refresh the page and try again."
      };
    }

    // Get student info for better error messages
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { fullName: true, admissionNumber: true, isExpelled: true },
    });

    if (!student) {
      return {
        success: false,
        error: "Student not found. Please verify the admission number and try again."
      };
    }

    // Check if student is expelled
    if (student.isExpelled) {
      return {
        success: false,
        error: `${student.fullName} has been expelled and cannot be marked for attendance. Please contact an administrator if this is an error.`
      };
    }

    // Check if student has checked in at the gate this weekend (for CHAPEL sessions only)
    // Students can check in on either Saturday or Sunday, and attend chapel on either day
    if (session.sessionType === "CHAPEL") {
      const checkIns = await prisma.checkIn.findMany({
        where: {
          studentId: data.studentId,
          weekendId: session.weekendId,
        },
      });

      if (checkIns.length === 0) {
        return {
          success: false,
          error: `${student.fullName} has not checked in at the gate this weekend. Students must check in at security before chapel attendance can be marked.`
        };
      }
    }

    // Determine the date based on session day
    const attendanceDate = new Date(session.weekend.saturdayDate);
    if (session.day === "SUNDAY") {
      attendanceDate.setDate(attendanceDate.getDate() + 1);
    }

    // Format the day nicely
    const dayName = session.day === "SATURDAY" ? "Saturday" : "Sunday";
    const sessionTypeName = session.sessionType === "CHAPEL" ? "Chapel" : "Class";

    // For CHAPEL sessions: Check if student has attended ANY chapel session this weekend (Sat OR Sun)
    // For CLASS sessions: Check if student has attended this specific class session on this day
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: data.studentId,
        session: {
          sessionType: session.sessionType,
          weekendId: session.weekendId,
          // For CHAPEL: don't filter by day (can attend either Sat or Sun)
          // For CLASS: filter by day (must attend specific day's class)
          ...(session.sessionType === "CLASS" ? { day: session.day } : {}),
        },
      },
      include: {
        session: true,
      },
    });

    if (existingAttendance) {
      const markedTime = new Date(existingAttendance.markedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const markedDay = existingAttendance.session.day === "SATURDAY" ? "Saturday" : "Sunday";

      if (session.sessionType === "CHAPEL") {
        return {
          success: false,
          error: `${student.fullName} has already attended Chapel this weekend on ${markedDay}. Chapel attendance is once per weekend (attendance recorded at ${markedTime}).`
        };
      } else {
        return {
          success: false,
          error: `${student.fullName} has already been marked for ${sessionTypeName} today (${dayName}). Attendance was recorded at ${markedTime}.`
        };
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId: data.studentId,
        sessionId: data.sessionId,
        classId: data.classId || null,
        markedBy: currentUser.name || "System",
      },
      include: {
        student: { include: { course: true } },
        session: { include: { weekend: true } },
        class: { include: { course: true } },
      },
    });

    revalidatePath("/staff");
    return {
      success: true,
      data: attendance
    };
  } catch (error: any) {
    console.error("Mark attendance error:", error);
    // Handle unique constraint violation (student already marked for this exact session)
    if (error.code === "P2002") {
      return {
        success: false,
        error: "This student has already been marked for this session. Each student can only be marked once per session."
      };
    }
    return {
      success: false,
      error: "Failed to mark attendance. Please try again."
    };
  }
}

/**
 * Get attendance by session with pagination
 * @param sessionId - Session ID
 * @param classId - Optional class ID filter
 * @param limit - Maximum records to return (default 200 for typical class size)
 * @param offset - Records to skip (default 0)
 */
export async function getAttendanceBySession(
  sessionId: string,
  classId?: string,
  limit: number = 200,
  offset: number = 0
) {
  const currentUser = await getUser();
  if (!currentUser || !["STAFF", "ADMIN", "TEACHER"].includes(currentUser.role)) {
    throw new Error("You don't have permission to view attendance records.");
  }

  // If teacher, verify they own this class
  if (currentUser.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: currentUser.id },
    });

    if (!teacher) {
      throw new Error("Teacher profile not found.");
    }

    // Force filter to teacher's class
    classId = teacher.classId;
  }

  const where = classId
    ? { sessionId, classId }
    : { sessionId };

  return await prisma.attendance.findMany({
    where,
    include: {
      student: { include: { course: true } },
      class: { include: { course: true } },
    },
    orderBy: { markedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function deleteAttendance(id: string) {
  const currentUser = await getUser();
  if (!currentUser || !["STAFF", "ADMIN", "TEACHER"].includes(currentUser.role)) {
    throw new Error("You don't have permission to delete attendance records.");
  }

  // If teacher, verify the attendance record is for their class
  if (currentUser.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: currentUser.id },
    });

    if (!teacher) {
      throw new Error("Teacher profile not found.");
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance || attendance.classId !== teacher.classId) {
      throw new Error("You don't have permission to delete this attendance record.");
    }
  }

  try {
    await prisma.attendance.delete({ where: { id } });
    revalidatePath("/staff");
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("This attendance record was already deleted or doesn't exist.");
    }
    throw new Error("Failed to delete attendance record. Please try again.");
  }
}
