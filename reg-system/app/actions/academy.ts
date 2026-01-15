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

export async function generateWeekends(data: { startDate: Date; startName: string }) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const weekends = [];
  const startDate = new Date(data.startDate);

  // Generate 12 weeks
  for (let i = 0; i < 12; i++) {
    const saturdayDate = new Date(startDate);
    saturdayDate.setDate(startDate.getDate() + (i * 7)); // Add 7 days for each week

    // Extract number from start name or use incrementing numbers
    const nameMatch = data.startName.match(/(\d+)/);
    const startNum = nameMatch ? parseInt(nameMatch[1]) : 1;
    const weekNumber = startNum + i;
    const name = data.startName.replace(/\d+/, weekNumber.toString());

    weekends.push({
      saturdayDate,
      name: name.includes(weekNumber.toString()) ? name : `Weekend ${weekNumber}`,
    });
  }

  // Create all weekends in a transaction
  await prisma.$transaction(
    weekends.map((weekend) => prisma.weekend.create({ data: weekend }))
  );

  revalidatePath("/admin/weekends");
  return weekends;
}

export async function generateRemainingWeekends() {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Get existing weekends
  const existingWeekends = await prisma.weekend.findMany({
    orderBy: { saturdayDate: "asc" },
  });

  if (existingWeekends.length === 0) {
    throw new Error("No weekends found. Please create the first weekend manually.");
  }

  if (existingWeekends.length >= 12) {
    throw new Error("Already have 12 or more weekends.");
  }

  // Get the last weekend
  const lastWeekend = existingWeekends[existingWeekends.length - 1];

  // Extract number from the name (e.g., "Weekend 1" -> 1)
  const nameMatch = lastWeekend.name.match(/(\d+)/);
  const lastNumber = nameMatch ? parseInt(nameMatch[1]) : existingWeekends.length;

  // Calculate how many more we need
  const needToCreate = 12 - existingWeekends.length;

  const weekendsToCreate = [];
  const lastDate = new Date(lastWeekend.saturdayDate);

  for (let i = 1; i <= needToCreate; i++) {
    const newDate = new Date(lastDate);
    newDate.setDate(lastDate.getDate() + (i * 7)); // Add 7 days for each week

    const weekNumber = lastNumber + i;
    const name = lastWeekend.name.replace(/\d+/, weekNumber.toString());

    weekendsToCreate.push({
      saturdayDate: newDate,
      name: name.includes(weekNumber.toString()) ? name : `Weekend ${weekNumber}`,
    });
  }

  // Create all weekends in a transaction
  await prisma.$transaction(
    weekendsToCreate.map((weekend) => prisma.weekend.create({ data: weekend }))
  );

  revalidatePath("/admin/weekends");
  return { created: needToCreate, total: 12 };
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

  // Get all weekends
  const weekends = await prisma.weekend.findMany({
    orderBy: { saturdayDate: "asc" },
  });

  if (weekends.length === 0) {
    throw new Error("No weekends found. Please create weekends first.");
  }

  // Create session for ALL weekends
  const sessionsToCreate = weekends.map((weekend) => ({
    weekendId: weekend.id,
    day: data.day,
    sessionType: data.sessionType,
    name: data.name,
    startTime: data.startTime,
    endTime: data.endTime,
  }));

  // Create all sessions in a transaction
  await prisma.$transaction(
    sessionsToCreate.map((session) => prisma.session.create({ data: session }))
  );

  revalidatePath("/admin/sessions");
  return { created: weekends.length };
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
