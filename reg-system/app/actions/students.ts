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
  churchDistrict: string;
  profilePicture?: string;
}) {
  const currentUser = await getUser();
  if (!currentUser || (currentUser.role !== "CASHIER" && currentUser.role !== "ADMIN")) {
    return {
      success: false,
      error: "You don't have permission to register students. Please contact an administrator."
    };
  }

  // Check if admission number already exists
  const existingStudent = await prisma.student.findUnique({
    where: { admissionNumber: data.admissionNumber },
  });

  if (existingStudent) {
    return {
      success: false,
      error: `A student with admission number "${data.admissionNumber}" already exists. The existing student is: ${existingStudent.fullName}. Please use a different admission number.`
    };
  }

  // Check if ID/Passport already exists
  const existingId = await prisma.student.findFirst({
    where: { identification: data.identification },
  });

  if (existingId) {
    return {
      success: false,
      error: `A student with ID/Passport "${data.identification}" is already registered. The existing student is: ${existingId.fullName} (Admission #${existingId.admissionNumber}). Please verify the student's details.`
    };
  }

  try {
    const student = await prisma.student.create({
      data,
      include: { course: true },
    });

    revalidatePath("/cashier");
    revalidatePath("/cashier/students");
    return {
      success: true,
      student
    };
  } catch (error: any) {
    // Handle any unexpected Prisma errors
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      if (field === "admissionNumber") {
        return {
          success: false,
          error: "This admission number is already registered. Please use a different one."
        };
      }
      return {
        success: false,
        error: `A student with this ${field || "information"} already exists.`
      };
    }
    return {
      success: false,
      error: "Failed to register student. Please try again or contact support."
    };
  }
}

export async function getStudents(search?: string) {
  const currentUser = await getUser();
  if (!currentUser) {
    throw new Error("Please log in to view students.");
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

/**
 * Get student by admission number - OPTIMIZED for scanning
 * Returns only essential student info without attendance history
 * Use getStudentByAdmissionWithHistory() for detailed views
 */
export async function getStudentByAdmission(admissionNumber: string) {
  const currentUser = await getUser();
  if (!currentUser) {
    throw new Error("Please log in to search for students.");
  }

  const student = await prisma.student.findUnique({
    where: { admissionNumber },
    include: {
      course: true,
    },
  });

  return student;
}

/**
 * Get student with full attendance history - for detailed views/passport
 * ONLY use this when displaying full attendance passport, NOT for scanning
 */
export async function getStudentByAdmissionWithHistory(admissionNumber: string) {
  const currentUser = await getUser();
  if (!currentUser) {
    throw new Error("Please log in to search for students.");
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
        take: 50, // Limit to last 50 attendance records for performance
      },
    },
  });

  if (!student) return null;

  // Fetch weekends for passport display (oldest first for chronological order)
  const weekends = await prisma.weekend.findMany({
    orderBy: { saturdayDate: "asc" },
    take: 12, // Only last 12 weekends for performance
  });

  return {
    ...student,
    weekends,
  };
}

/**
 * Get student by ID with full history - for admin detail page
 * Includes attendance history, weekends, and check-in records
 */
export async function getStudentByIdWithHistory(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can view detailed student profiles.");
  }

  const student = await prisma.student.findUnique({
    where: { id },
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
        take: 100, // More records for admin analytics
      },
      checkIns: {
        include: {
          weekend: true,
        },
        orderBy: { checkedAt: "desc" },
        take: 50, // Last 50 check-ins
      },
    },
  });

  if (!student) return null;

  // Fetch all weekends for full analytics
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
    throw new Error("Only administrators can delete students.");
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
    throw new Error("You don't have permission to update profile pictures.");
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { profilePicture: profilePictureUrl },
  });

  revalidatePath("/cashier");
  revalidatePath("/cashier/students");
  revalidatePath("/security");
}

export async function expelStudent(studentId: string, reason: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can expel students.");
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { fullName: true, isExpelled: true },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  if (student.isExpelled) {
    throw new Error(`${student.fullName} is already expelled.`);
  }

  if (!reason || reason.trim().length < 5) {
    throw new Error("Please provide a reason for the expulsion (at least 5 characters).");
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      isExpelled: true,
      expelledAt: new Date(),
      expelledReason: reason.trim(),
    },
  });

  revalidatePath("/admin/students");
  revalidatePath("/security");
}

export async function reinstateStudent(studentId: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can reinstate students.");
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { fullName: true, isExpelled: true },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  if (!student.isExpelled) {
    throw new Error(`${student.fullName} is not expelled.`);
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      isExpelled: false,
      expelledAt: null,
      expelledReason: null,
    },
  });

  revalidatePath("/admin/students");
  revalidatePath("/security");
}

export async function deleteProfilePicture(studentId: string) {
  const currentUser = await getUser();
  if (!currentUser || (currentUser.role !== "CASHIER" && currentUser.role !== "ADMIN")) {
    throw new Error("You don't have permission to delete profile pictures.");
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

export async function warnStudent(studentId: string, reason: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can warn students.");
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { fullName: true, hasWarning: true, isExpelled: true },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  if (student.isExpelled) {
    throw new Error(`${student.fullName} is expelled and cannot be warned.`);
  }

  if (student.hasWarning) {
    throw new Error(`${student.fullName} already has an active warning.`);
  }

  if (!reason || reason.trim().length < 5) {
    throw new Error("Please provide a reason for the warning (at least 5 characters).");
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      hasWarning: true,
      warnedAt: new Date(),
      warningReason: reason.trim(),
    },
  });

  revalidatePath("/admin/students");
  revalidatePath("/security");
}

export async function removeWarning(studentId: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can remove warnings.");
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { fullName: true, hasWarning: true },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  if (!student.hasWarning) {
    throw new Error(`${student.fullName} does not have an active warning.`);
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      hasWarning: false,
      warnedAt: null,
      warningReason: null,
    },
  });

  revalidatePath("/admin/students");
  revalidatePath("/security");
}
