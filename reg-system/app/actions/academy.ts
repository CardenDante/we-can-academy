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
    throw new Error("Only administrators can create classes.");
  }

  // Get the course for better error messages
  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
  });

  if (!course) {
    throw new Error("The selected course was not found. Please refresh and try again.");
  }

  // Check if class already exists
  const existingClass = await prisma.class.findFirst({
    where: {
      courseId: data.courseId,
      name: data.name,
    },
  });

  if (existingClass) {
    throw new Error(
      `A class named "${data.name}" already exists for ${course.name}. Please use a different name.`
    );
  }

  try {
    const cls = await prisma.class.create({
      data,
      include: { course: true },
    });

    revalidatePath("/admin/classes");
    return cls;
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error(`A class named "${data.name}" already exists for this course.`);
    }
    throw new Error("Failed to create class. Please try again.");
  }
}

export async function deleteClass(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can delete classes.");
  }

  const classToDelete = await prisma.class.findUnique({
    where: { id },
    include: {
      course: true,
      _count: { select: { attendances: true } },
    },
  });

  if (!classToDelete) {
    throw new Error("Class not found. It may have already been deleted.");
  }

  if (classToDelete._count.attendances > 0) {
    throw new Error(
      `Cannot delete "${classToDelete.name}" (${classToDelete.course.name}) because it has ` +
      `${classToDelete._count.attendances} attendance record(s).`
    );
  }

  try {
    await prisma.class.delete({ where: { id } });
    revalidatePath("/admin/classes");
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("This class was already deleted.");
    }
    throw new Error(`Failed to delete "${classToDelete.name}". Please try again.`);
  }
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
    throw new Error("Only administrators can create weekends.");
  }

  // Check if weekend already exists for this date
  const existingWeekend = await prisma.weekend.findUnique({
    where: { saturdayDate: data.saturdayDate },
  });

  if (existingWeekend) {
    const formattedDate = data.saturdayDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    throw new Error(
      `A weekend already exists for ${formattedDate}. The existing weekend is named "${existingWeekend.name}".`
    );
  }

  try {
    const weekend = await prisma.weekend.create({ data });
    revalidatePath("/admin/weekends");
    return weekend;
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("A weekend for this date already exists.");
    }
    throw new Error("Failed to create weekend. Please try again.");
  }
}

export async function deleteWeekend(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can delete weekends.");
  }

  const weekend = await prisma.weekend.findUnique({
    where: { id },
    include: {
      sessions: {
        include: { _count: { select: { attendances: true } } },
      },
    },
  });

  if (!weekend) {
    throw new Error("Weekend not found. It may have already been deleted.");
  }

  const hasAttendance = weekend.sessions.some((s) => s._count.attendances > 0);
  if (hasAttendance) {
    throw new Error(
      `Cannot delete "${weekend.name}" because it has attendance records. ` +
      `Please delete the attendance records first.`
    );
  }

  try {
    await prisma.weekend.delete({ where: { id } });
    revalidatePath("/admin/weekends");
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("This weekend was already deleted.");
    }
    throw new Error(`Failed to delete "${weekend.name}". Please try again.`);
  }
}

export async function generateWeekends(data: { startDate: Date; startName: string }) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can generate weekends.");
  }

  const weekends = [];
  const startDate = new Date(data.startDate);

  // Generate 12 weeks
  for (let i = 0; i < 12; i++) {
    const saturdayDate = new Date(startDate);
    saturdayDate.setDate(startDate.getDate() + (i * 7));

    const nameMatch = data.startName.match(/(\d+)/);
    const startNum = nameMatch ? parseInt(nameMatch[1]) : 1;
    const weekNumber = startNum + i;
    const name = data.startName.replace(/\d+/, weekNumber.toString());

    weekends.push({
      saturdayDate,
      name: name.includes(weekNumber.toString()) ? name : `Weekend ${weekNumber}`,
    });
  }

  try {
    await prisma.$transaction(
      weekends.map((weekend) => prisma.weekend.create({ data: weekend }))
    );

    revalidatePath("/admin/weekends");
    return weekends;
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error(
        "Some weekends already exist for these dates. Please check existing weekends or choose a different start date."
      );
    }
    throw new Error("Failed to generate weekends. Please try again.");
  }
}

export async function generateRemainingWeekends() {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can generate weekends.");
  }

  const existingWeekends = await prisma.weekend.findMany({
    orderBy: { saturdayDate: "asc" },
  });

  if (existingWeekends.length === 0) {
    throw new Error("No weekends found. Please create the first weekend manually before generating more.");
  }

  if (existingWeekends.length >= 12) {
    throw new Error("You already have 12 or more weekends. No additional weekends needed.");
  }

  const lastWeekend = existingWeekends[existingWeekends.length - 1];
  const nameMatch = lastWeekend.name.match(/(\d+)/);
  const lastNumber = nameMatch ? parseInt(nameMatch[1]) : existingWeekends.length;

  const needToCreate = 12 - existingWeekends.length;
  const weekendsToCreate = [];
  const lastDate = new Date(lastWeekend.saturdayDate);

  for (let i = 1; i <= needToCreate; i++) {
    const newDate = new Date(lastDate);
    newDate.setDate(lastDate.getDate() + (i * 7));

    const weekNumber = lastNumber + i;
    const name = lastWeekend.name.replace(/\d+/, weekNumber.toString());

    weekendsToCreate.push({
      saturdayDate: newDate,
      name: name.includes(weekNumber.toString()) ? name : `Weekend ${weekNumber}`,
    });
  }

  try {
    await prisma.$transaction(
      weekendsToCreate.map((weekend) => prisma.weekend.create({ data: weekend }))
    );

    revalidatePath("/admin/weekends");
    return { created: needToCreate, total: 12 };
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("Some weekend dates conflict with existing weekends.");
    }
    throw new Error("Failed to generate remaining weekends. Please try again.");
  }
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
    throw new Error("Only administrators can create sessions.");
  }

  const weekends = await prisma.weekend.findMany({
    orderBy: { saturdayDate: "asc" },
  });

  if (weekends.length === 0) {
    throw new Error("No weekends found. Please create weekends first before adding sessions.");
  }

  const sessionsToCreate = weekends.map((weekend) => ({
    weekendId: weekend.id,
    day: data.day,
    sessionType: data.sessionType,
    name: data.name,
    startTime: data.startTime,
    endTime: data.endTime,
  }));

  const dayName = data.day === "SATURDAY" ? "Saturday" : "Sunday";
  const typeName = data.sessionType === "CHAPEL" ? "Chapel" : "Class";

  try {
    await prisma.$transaction(
      sessionsToCreate.map((session) => prisma.session.create({ data: session }))
    );

    revalidatePath("/admin/sessions");
    return { created: weekends.length };
  } catch (error: any) {
    throw new Error(
      `Failed to create ${typeName} session "${data.name}" for ${dayName}. Please try again.`
    );
  }
}

export async function deleteSession(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can delete sessions.");
  }

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      weekend: true,
      _count: { select: { attendances: true } },
    },
  });

  if (!session) {
    throw new Error("Session not found. It may have already been deleted.");
  }

  if (session._count.attendances > 0) {
    throw new Error(
      `Cannot delete "${session.name}" because it has ${session._count.attendances} attendance record(s). ` +
      `Please delete the attendance records first.`
    );
  }

  try {
    await prisma.session.delete({ where: { id } });
    revalidatePath("/admin/sessions");
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("This session was already deleted.");
    }
    throw new Error(`Failed to delete "${session.name}". Please try again.`);
  }
}

export async function assignClassToSession(sessionId: string, classId: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can assign classes to sessions.");
  }

  // Check if already assigned
  const existing = await prisma.sessionClass.findFirst({
    where: { sessionId, classId },
  });

  if (existing) {
    throw new Error("This class is already assigned to this session.");
  }

  try {
    const sessionClass = await prisma.sessionClass.create({
      data: { sessionId, classId },
    });

    revalidatePath("/admin/sessions");
    return sessionClass;
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("This class is already assigned to this session.");
    }
    throw new Error("Failed to assign class to session. Please try again.");
  }
}

export async function removeClassFromSession(sessionId: string, classId: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can remove classes from sessions.");
  }

  try {
    await prisma.sessionClass.deleteMany({
      where: { sessionId, classId },
    });

    revalidatePath("/admin/sessions");
  } catch (error: any) {
    throw new Error("Failed to remove class from session. Please try again.");
  }
}
