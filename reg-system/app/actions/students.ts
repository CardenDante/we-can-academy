"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function registerStudent(data: {
  fullName: string;
  gender: "MALE" | "FEMALE";
  courseId: string;
  areaOfResidence: string;
  phoneNumber: string;
  identification: string;
  admissionNumber: string;
}) {
  const currentUser = await getUser();
  if (!currentUser || (currentUser.role !== "CASHIER" && currentUser.role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }

  const student = await prisma.student.create({
    data,
    include: { course: true },
  });

  revalidatePath("/cashier");
  revalidatePath("/cashier/students");
  return student;
}

export async function getStudents(search?: string) {
  const currentUser = await getUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const where = search
    ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { admissionNumber: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  return await prisma.student.findMany({
    where,
    include: { course: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getStudentByAdmission(admissionNumber: string) {
  const currentUser = await getUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const student = await prisma.student.findUnique({
    where: { admissionNumber },
    include: {
      course: true,
      attendances: {
        include: {
          session: {
            include: {
              weekend: true,
            },
          },
          class: true,
        },
        orderBy: { markedAt: "desc" },
      },
    },
  });

  if (!student) return null;

  // Fetch all weekends for passport display
  const weekends = await prisma.weekend.findMany({
    orderBy: { saturdayDate: "asc" },
  });

  return {
    ...student,
    weekends,
  };
}

export async function deleteStudent(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.student.delete({ where: { id } });
  revalidatePath("/admin/students");
  revalidatePath("/cashier/students");
}
