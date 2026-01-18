"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
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

  // Check if a class with this name already exists for this course
  const existingClass = await prisma.class.findFirst({
    where: {
      courseId: data.courseId,
      name: data.name,
    },
  });

  if (existingClass) {
    throw new Error(
      `A class named "${data.name}" already exists for ${course.name}. ` +
      `Please use a different class name.`
    );
  }

  try {
    await prisma.class.create({
      data,
    });
    revalidatePath("/admin/classes");
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

  // Get the class with attendance count
  const classToDelete = await prisma.class.findUnique({
    where: { id },
    include: {
      course: true,
      _count: {
        select: { attendances: true },
      },
    },
  });

  if (!classToDelete) {
    throw new Error("Class not found. It may have already been deleted.");
  }

  if (classToDelete._count.attendances > 0) {
    throw new Error(
      `Cannot delete "${classToDelete.name}" (${classToDelete.course.name}) because it has ` +
      `${classToDelete._count.attendances} attendance record(s). ` +
      `Please delete the attendance records first if you need to remove this class.`
    );
  }

  try {
    await prisma.class.delete({
      where: { id },
    });
    revalidatePath("/admin/classes");
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("This class was already deleted.");
    }
    throw new Error(`Failed to delete class "${classToDelete.name}". Please try again.`);
  }
}
