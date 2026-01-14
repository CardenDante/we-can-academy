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
