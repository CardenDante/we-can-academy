"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markAttendance(data: {
  studentId: string;
  sessionId: string;
  classId?: string;
}) {
  const currentUser = await getUser();
  if (!currentUser || (currentUser.role !== "STAFF" && currentUser.role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }

  // Get the session to determine the date
  const session = await prisma.session.findUnique({
    where: { id: data.sessionId },
    include: { weekend: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Determine the date based on session day
  const attendanceDate = new Date(session.weekend.saturdayDate);
  if (session.day === "SUNDAY") {
    attendanceDate.setDate(attendanceDate.getDate() + 1);
  }

  // Normalize to start of day for comparison
  const startOfDay = new Date(attendanceDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(attendanceDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Check if student already has attendance for this session type on this day
  const existingAttendance = await prisma.attendance.findFirst({
    where: {
      studentId: data.studentId,
      session: {
        sessionType: session.sessionType,
        weekend: {
          id: session.weekend.id,
        },
        day: session.day,
      },
    },
    include: {
      session: true,
    },
  });

  if (existingAttendance) {
    throw new Error(
      `Student has already been marked for ${session.sessionType} on ${session.day} of ${session.weekend.name}`
    );
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
  return attendance;
}

export async function getAttendanceBySession(sessionId: string, classId?: string) {
  const currentUser = await getUser();
  if (!currentUser || (currentUser.role !== "STAFF" && currentUser.role !== "ADMIN")) {
    throw new Error("Unauthorized");
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
  });
}

export async function deleteAttendance(id: string) {
  const currentUser = await getUser();
  if (!currentUser || (currentUser.role !== "STAFF" && currentUser.role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }

  await prisma.attendance.delete({ where: { id } });
  revalidatePath("/staff");
}
