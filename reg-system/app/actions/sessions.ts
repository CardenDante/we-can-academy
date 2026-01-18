"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { DayOfWeekend, SessionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getSessions() {
  return await prisma.session.findMany({
    include: {
      weekend: true,
      sessionClasses: {
        include: {
          class: {
            include: {
              course: true,
            },
          },
        },
      },
    },
    orderBy: [{ weekend: { saturdayDate: "desc" } }, { day: "asc" }],
  });
}

export async function getActiveSessions() {
  return await prisma.session.findMany({
    include: {
      weekend: true,
      sessionClasses: {
        include: {
          class: {
            include: {
              course: true,
            },
          },
        },
      },
    },
    orderBy: [{ weekend: { saturdayDate: "desc" } }, { day: "asc" }],
    take: 20,
  });
}

export async function createSession(data: {
  weekendId: string;
  day: DayOfWeekend;
  sessionType: SessionType;
  name: string;
  startTime: string;
  endTime: string;
  classIds: string[];
}) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can create sessions.");
  }

  // Get the weekend for better error messages
  const weekend = await prisma.weekend.findUnique({
    where: { id: data.weekendId },
  });

  if (!weekend) {
    throw new Error("The selected weekend was not found. Please refresh and try again.");
  }

  const { classIds, ...sessionData } = data;

  const dayName = data.day === "SATURDAY" ? "Saturday" : "Sunday";
  const sessionTypeName = data.sessionType === "CHAPEL" ? "Chapel" : "Class";

  try {
    const session = await prisma.session.create({
      data: sessionData,
    });

    if (classIds.length > 0) {
      await prisma.sessionClass.createMany({
        data: classIds.map((classId) => ({
          sessionId: session.id,
          classId,
        })),
      });
    }

    revalidatePath("/admin/sessions");
    return session;
  } catch (error: any) {
    throw new Error(
      `Failed to create ${sessionTypeName} session for ${dayName} of ${weekend.name}. Please try again.`
    );
  }
}

export async function deleteSession(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can delete sessions.");
  }

  // Get the session with attendance count
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      weekend: true,
      _count: {
        select: { attendances: true },
      },
    },
  });

  if (!session) {
    throw new Error("Session not found. It may have already been deleted.");
  }

  if (session._count.attendances > 0) {
    const dayName = session.day === "SATURDAY" ? "Saturday" : "Sunday";
    throw new Error(
      `Cannot delete this session because it has ${session._count.attendances} attendance record(s). ` +
      `The session "${session.name}" on ${dayName} of ${session.weekend.name} has students marked. ` +
      `Please delete the attendance records first if you need to remove this session.`
    );
  }

  try {
    await prisma.session.delete({
      where: { id },
    });
    revalidatePath("/admin/sessions");
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("This session was already deleted.");
    }
    throw new Error(`Failed to delete session "${session.name}". Please try again.`);
  }
}
