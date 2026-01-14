"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getWeekends() {
  return await prisma.weekend.findMany({
    include: {
      _count: {
        select: {
          sessions: true,
        },
      },
    },
    orderBy: { saturdayDate: "desc" },
  });
}

export async function createWeekend(data: {
  saturdayDate: string;
  name: string;
}) {
  await prisma.weekend.create({
    data: {
      saturdayDate: new Date(data.saturdayDate),
      name: data.name,
    },
  });
  revalidatePath("/admin/weekends");
}

export async function deleteWeekend(id: string) {
  await prisma.weekend.delete({
    where: { id },
  });
  revalidatePath("/admin/weekends");
}
