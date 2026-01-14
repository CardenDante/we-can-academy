"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getClasses() {
  return await prisma.class.findMany({
    include: {
      course: true,
      _count: {
        select: {
          sessionClasses: true,
        },
      },
    },
    orderBy: [{ course: { name: "asc" } }, { name: "asc" }],
  });
}

export async function createClass(data: { name: string; courseId: string }) {
  await prisma.class.create({
    data,
  });
  revalidatePath("/admin/classes");
}

export async function deleteClass(id: string) {
  await prisma.class.delete({
    where: { id },
  });
  revalidatePath("/admin/classes");
}
