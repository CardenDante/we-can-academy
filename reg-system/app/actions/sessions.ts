"use server";

import { prisma } from "@/lib/prisma";
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
  const { classIds, ...sessionData } = data;

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
}

export async function deleteSession(id: string) {
  await prisma.session.delete({
    where: { id },
  });
  revalidatePath("/admin/sessions");
}
