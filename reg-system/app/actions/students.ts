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
  profilePicture?: string;
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

  // Get student to check for profile picture
  const student = await prisma.student.findUnique({
    where: { id },
    select: { profilePicture: true },
  });

  // Delete profile picture file if it exists
  if (student?.profilePicture) {
    try {
      const { unlink } = await import("fs/promises");
      const { join } = await import("path");
      const filePath = join(process.cwd(), "public", student.profilePicture);
      await unlink(filePath);
    } catch (error) {
      console.log("Failed to delete profile picture file:", error);
      // Continue with student deletion even if file deletion fails
    }
  }

  await prisma.student.delete({ where: { id } });
  revalidatePath("/admin/students");
  revalidatePath("/cashier/students");
}

export async function updateProfilePicture(studentId: string, profilePictureUrl: string) {
  const currentUser = await getUser();
  if (!currentUser || (currentUser.role !== "CASHIER" && currentUser.role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { profilePicture: profilePictureUrl },
  });

  revalidatePath("/cashier");
  revalidatePath("/cashier/students");
  revalidatePath("/security");
}

export async function deleteProfilePicture(studentId: string) {
  const currentUser = await getUser();
  if (!currentUser || (currentUser.role !== "CASHIER" && currentUser.role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { profilePicture: true },
  });

  if (student?.profilePicture) {
    try {
      const { unlink } = await import("fs/promises");
      const { join } = await import("path");
      const filePath = join(process.cwd(), "public", student.profilePicture);
      await unlink(filePath);
    } catch (error) {
      console.log("Failed to delete profile picture file:", error);
    }
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { profilePicture: null },
  });

  revalidatePath("/cashier");
  revalidatePath("/cashier/students");
  revalidatePath("/security");
}
