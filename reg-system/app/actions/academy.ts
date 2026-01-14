"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getCourses() {
  return await prisma.course.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { students: true, classes: true },
      },
    },
  });
}

export async function getClasses(courseId?: string) {
  const where = courseId ? { courseId } : {};
  return await prisma.class.findMany({
    where,
    include: { course: true },
    orderBy: [{ courseId: "asc" }, { name: "asc" }],
  });
}

export async function createClass(data: { name: string; courseId: string }) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const cls = await prisma.class.create({
    data,
    include: { course: true },
  });

  revalidatePath("/admin/classes");
  return cls;
}

export async function deleteClass(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.class.delete({ where: { id } });
  revalidatePath("/admin/classes");
}

export async function getWeekends() {
  return await prisma.weekend.findMany({
    orderBy: { saturdayDate: "desc" },
    include: {
      _count: {
        select: { sessions: true },
      },
    },
  });
}

export async function createWeekend(data: { saturdayDate: Date; name: string }) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const weekend = await prisma.weekend.create({ data });
  revalidatePath("/admin/weekends");
  return weekend;
}

export async function deleteWeekend(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.weekend.delete({ where: { id } });
  revalidatePath("/admin/weekends");
}

export async function getSessions(weekendId?: string) {
  const where = weekendId ? { weekendId } : {};
  return await prisma.session.findMany({
    where,
    include: {
      weekend: true,
      sessionClasses: {
        include: { class: { include: { course: true } } },
      },
    },
    orderBy: [{ weekend: { saturdayDate: "desc" } }, { day: "asc" }],
  });
}

export async function createSession(data: {
  weekendId: string;
  day: "SATURDAY" | "SUNDAY";
  sessionType: "CLASS" | "CHAPEL";
  name: string;
  startTime: string;
  endTime: string;
}) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const session = await prisma.session.create({
    data,
    include: { weekend: true },
  });

  revalidatePath("/admin/sessions");
  return session;
}

export async function deleteSession(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.session.delete({ where: { id } });
  revalidatePath("/admin/sessions");
}

export async function assignClassToSession(sessionId: string, classId: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const sessionClass = await prisma.sessionClass.create({
    data: { sessionId, classId },
  });

  revalidatePath("/admin/sessions");
  return sessionClass;
}

export async function removeClassFromSession(sessionId: string, classId: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.sessionClass.deleteMany({
    where: { sessionId, classId },
  });

  revalidatePath("/admin/sessions");
}
