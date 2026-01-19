"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Complete a weekend and mark all students who didn't check in as MISSED
 * This should be called after Sunday's last session ends
 */
export async function completeWeekend(weekendId: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can complete weekends.");
  }

  // Get the weekend
  const weekend = await prisma.weekend.findUnique({
    where: { id: weekendId },
    include: {
      checkIns: {
        include: {
          student: true,
        },
      },
    },
  });

  if (!weekend) {
    throw new Error("Weekend not found.");
  }

  if (weekend.isCompleted) {
    throw new Error(`${weekend.name} is already completed.`);
  }

  // Get all active students (not expelled)
  const allStudents = await prisma.student.findMany({
    where: { isExpelled: false },
    select: { id: true, fullName: true },
  });

  // Find students who checked in on Saturday
  const saturdayCheckIns = weekend.checkIns.filter((c) => c.day === "SATURDAY");
  const saturdayStudentIds = new Set(saturdayCheckIns.map((c) => c.studentId));

  // Find students who checked in on Sunday
  const sundayCheckIns = weekend.checkIns.filter((c) => c.day === "SUNDAY");
  const sundayStudentIds = new Set(sundayCheckIns.map((c) => c.studentId));

  // Create MISSED records for students who didn't check in
  const missedRecords: Array<{
    studentId: string;
    weekendId: string;
    day: "SATURDAY" | "SUNDAY";
    status: "MISSED";
    checkedAt: Date;
    checkedBy: string;
  }> = [];

  for (const student of allStudents) {
    // Check Saturday
    if (!saturdayStudentIds.has(student.id)) {
      missedRecords.push({
        studentId: student.id,
        weekendId: weekend.id,
        day: "SATURDAY" as const,
        status: "MISSED" as const,
        checkedAt: new Date(), // Use current time as "marked missed" time
        checkedBy: "System (Auto-marked as MISSED)",
      });
    }

    // Check Sunday
    if (!sundayStudentIds.has(student.id)) {
      missedRecords.push({
        studentId: student.id,
        weekendId: weekend.id,
        day: "SUNDAY" as const,
        status: "MISSED" as const,
        checkedAt: new Date(),
        checkedBy: "System (Auto-marked as MISSED)",
      });
    }
  }

  // Create all missed records and mark weekend as complete
  await prisma.$transaction(async (tx) => {
    // Create missed check-in records
    if (missedRecords.length > 0) {
      await tx.checkIn.createMany({
        data: missedRecords,
        skipDuplicates: true, // Skip if somehow already exists
      });
    }

    // Mark weekend as completed
    await tx.weekend.update({
      where: { id: weekendId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/analytics");

  return {
    success: true,
    missedCount: missedRecords.length,
    totalStudents: allStudents.length,
    presentCount: saturdayStudentIds.size + sundayStudentIds.size,
  };
}

/**
 * Get incomplete weekends that need to be marked complete
 */
export async function getIncompleteWeekends() {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can view incomplete weekends.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get weekends that are in the past but not completed
  const incompleteWeekends = await prisma.weekend.findMany({
    where: {
      isCompleted: false,
      saturdayDate: {
        lt: today, // Saturday date is before today
      },
    },
    include: {
      checkIns: true,
      sessions: {
        orderBy: { endTime: "desc" },
        take: 1, // Get the last session
      },
    },
    orderBy: { saturdayDate: "desc" },
  });

  return incompleteWeekends;
}
