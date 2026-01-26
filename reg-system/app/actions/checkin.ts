"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  getCurrentDate,
  getDayOfWeek,
  isWeekend,
  getCurrentWeekendDay,
  getWeekendSaturdayDate,
} from "@/lib/date-utils";

/**
 * Check in a student at the gate
 */
export async function checkInStudent(admissionNumber: string) {
  const currentUser = await getUser();
  if (!currentUser || (currentUser.role !== "SECURITY" && currentUser.role !== "ADMIN")) {
    throw new Error("Only security personnel can check in students.");
  }

  // Find the student
  const student = await prisma.student.findUnique({
    where: { admissionNumber },
    include: { course: true },
  });

  if (!student) {
    return {
      success: false,
      status: "not_found" as const,
      message: `No student found with admission number "${admissionNumber}".`,
      student: null,
    };
  }

  // Check if student is expelled
  if (student.isExpelled) {
    return {
      success: false,
      status: "expelled" as const,
      message: `⚠️ ALERT: ${student.fullName} has been EXPELLED and should NOT be allowed entry!`,
      reason: student.expelledReason,
      student: {
        id: student.id,
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        course: student.course,
        profilePicture: student.profilePicture,
        isExpelled: true,
        expelledReason: student.expelledReason,
      },
    };
  }

  // Check-in is ONLY allowed on Saturday (6) or Sunday (0)
  // Use date utility for testing support (TEST_DATE_OVERRIDE env var)
  if (!isWeekend()) {
    return {
      success: false,
      status: "not_weekend" as const,
      message: "Check-in is only available on Saturday and Sunday. Please come back on the weekend.",
      student: {
        id: student.id,
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        course: student.course,
        profilePicture: student.profilePicture,
        isExpelled: false,
      },
    };
  }

  // Calculate the Saturday of this weekend
  const saturdayDate = getWeekendSaturdayDate();

  const weekend = await prisma.weekend.findUnique({
    where: { saturdayDate },
  });

  if (!weekend) {
    return {
      success: false,
      status: "no_weekend" as const,
      message: "No active weekend found for today. Please contact an administrator.",
      student: {
        id: student.id,
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        course: student.course,
        profilePicture: student.profilePicture,
        isExpelled: false,
      },
    };
  }

  const currentDay = getCurrentWeekendDay();

  // Use upsert to prevent race conditions - handles concurrent check-ins safely
  // If record exists, do nothing (update with same data)
  // If record doesn't exist, create it
  const checkIn = await prisma.checkIn.upsert({
    where: {
      studentId_weekendId_day: {
        studentId: student.id,
        weekendId: weekend.id,
        day: currentDay,
      },
    },
    update: {
      // Don't modify if exists - just return existing record
    },
    create: {
      studentId: student.id,
      weekendId: weekend.id,
      day: currentDay,
      checkedBy: currentUser.name || "Security",
    },
  });

  // Check if this was an existing check-in or a new one
  const wasAlreadyCheckedIn = new Date(checkIn.checkedAt).getTime() < Date.now() - 1000; // Older than 1 second

  if (wasAlreadyCheckedIn) {
    const checkedInTime = new Date(checkIn.checkedAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return {
      success: true,
      status: "already_checked_in" as const,
      message: `${student.fullName} already checked in today at ${checkedInTime}.`,
      student: {
        id: student.id,
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        course: student.course,
        profilePicture: student.profilePicture,
        isExpelled: false,
        hasWarning: student.hasWarning,
        warningReason: student.warningReason,
      },
      checkIn,
    };
  }

  revalidatePath("/security");
  revalidatePath("/admin");

  return {
    success: true,
    status: "checked_in" as const,
    message: `${student.fullName} checked in successfully!`,
    student: {
      id: student.id,
      fullName: student.fullName,
      admissionNumber: student.admissionNumber,
      gender: student.gender,
      course: student.course,
      profilePicture: student.profilePicture,
      isExpelled: false,
      hasWarning: student.hasWarning,
      warningReason: student.warningReason,
    },
    checkIn,
  };
}

/**
 * Get today's check-ins with pagination
 * @param limit - Maximum number of records to return (default 100)
 * @param offset - Number of records to skip (default 0)
 */
export async function getTodayCheckIns(limit: number = 100, offset: number = 0) {
  const currentUser = await getUser();
  if (!currentUser) {
    throw new Error("Please log in to view check-ins.");
  }

  // Use date utility for testing support
  const saturdayDate = getWeekendSaturdayDate();

  const weekend = await prisma.weekend.findUnique({
    where: { saturdayDate },
  });

  if (!weekend) {
    return { checkIns: [], weekend: null, day: null, total: 0, hasMore: false };
  }

  const currentDay = getCurrentWeekendDay();

  // Get total count for pagination
  const total = await prisma.checkIn.count({
    where: {
      weekendId: weekend.id,
      day: currentDay,
    },
  });

  // Get paginated check-ins
  const checkIns = await prisma.checkIn.findMany({
    where: {
      weekendId: weekend.id,
      day: currentDay,
    },
    include: {
      student: {
        include: { course: true },
      },
    },
    orderBy: { checkedAt: "desc" },
    take: limit,
    skip: offset,
  });

  return {
    checkIns,
    weekend,
    day: currentDay,
    total,
    hasMore: offset + checkIns.length < total,
  };
}

/**
 * Check if a student has checked in today
 */
export async function hasCheckedInToday(studentId: string) {
  // Use date utility for testing support
  const saturdayDate = getWeekendSaturdayDate();

  const weekend = await prisma.weekend.findUnique({
    where: { saturdayDate },
  });

  if (!weekend) {
    return false;
  }

  const currentDay = getCurrentWeekendDay();

  const checkIn = await prisma.checkIn.findUnique({
    where: {
      studentId_weekendId_day: {
        studentId,
        weekendId: weekend.id,
        day: currentDay,
      },
    },
  });

  return !!checkIn;
}

/**
 * Get check-in stats for analytics
 */
export async function getCheckInStats(weekendId?: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can view check-in statistics.");
  }

  // If no weekendId provided, get the current weekend
  let targetWeekendId = weekendId;

  if (!targetWeekendId) {
    // Use date utility for testing support
    const saturdayDate = getWeekendSaturdayDate();

    const weekend = await prisma.weekend.findUnique({
      where: { saturdayDate },
    });

    if (!weekend) {
      return {
        totalCheckIns: 0,
        totalStudents: 0,
        checkInRate: 0,
        byCourse: [],
        missedCheckIns: [],
        weekendOver: false,
      };
    }
    targetWeekendId = weekend.id;
  }

  // Get total students (excluding expelled)
  const totalStudents = await prisma.student.count({
    where: { isExpelled: false },
  });

  // Determine current day using date utility for testing support
  const currentDay = getCurrentWeekendDay();

  // OPTIMIZED: Use database aggregation instead of N+1 queries
  // Get check-in counts by course using a single efficient query
  const checkInsByCourse = await prisma.$queryRaw<
    Array<{ courseName: string; checkInCount: bigint }>
  >`
    SELECT
      c.name as "courseName",
      COUNT(DISTINCT ci."studentId") as "checkInCount"
    FROM "Course" c
    LEFT JOIN "Student" s ON s."courseId" = c.id AND s."isExpelled" = false
    LEFT JOIN "CheckIn" ci ON ci."studentId" = s.id
      AND ci."weekendId" = ${targetWeekendId}
      AND ci."day" = ${currentDay}::"DayOfWeekend"
    GROUP BY c.id, c.name
    ORDER BY c.name
  `;

  // Get total students by course using aggregation
  const studentsByCourse = await prisma.$queryRaw<
    Array<{ courseName: string; totalStudents: bigint }>
  >`
    SELECT
      c.name as "courseName",
      COUNT(s.id) as "totalStudents"
    FROM "Course" c
    LEFT JOIN "Student" s ON s."courseId" = c.id AND s."isExpelled" = false
    GROUP BY c.id, c.name
    ORDER BY c.name
  `;

  // Combine results
  const byCourse = checkInsByCourse.map((checkIn) => {
    const studentCount = studentsByCourse.find(
      (s) => s.courseName === checkIn.courseName
    );
    return {
      courseName: checkIn.courseName,
      count: Number(checkIn.checkInCount),
      totalStudents: Number(studentCount?.totalStudents || 0),
    };
  });

  const totalCheckIns = byCourse.reduce((sum, c) => sum + c.count, 0);
  const checkInRate = totalStudents > 0 ? (totalCheckIns / totalStudents) * 100 : 0;

  // Get students who checked in but didn't attend chapel
  // ONLY show this data after the weekend is over (after Sunday)
  let studentsWhoMissedChapel: Array<{
    admissionNumber: string;
    fullName: string;
    courseName: string;
  }> = [];

  // Check if the weekend is over (after Sunday)
  const weekend = await prisma.weekend.findUnique({
    where: { id: targetWeekendId },
  });

  if (weekend) {
    const sundayDate = new Date(weekend.saturdayDate);
    sundayDate.setDate(sundayDate.getDate() + 1);
    sundayDate.setHours(23, 59, 59, 999); // End of Sunday

    const now = new Date();

    // Only get missed chapel data if the weekend is over (after Sunday)
    if (now > sundayDate) {
      studentsWhoMissedChapel = await prisma.$queryRaw<
        Array<{
          admissionNumber: string;
          fullName: string;
          courseName: string;
        }>
      >`
        SELECT DISTINCT
          s."admissionNumber",
          s."fullName",
          c.name as "courseName"
        FROM (
          SELECT DISTINCT ci."studentId"
          FROM "CheckIn" ci
          WHERE ci."weekendId" = ${targetWeekendId}
        ) AS checkedInStudents
        JOIN "Student" s ON checkedInStudents."studentId" = s.id
        JOIN "Course" c ON s."courseId" = c.id
        LEFT JOIN "Attendance" a ON a."studentId" = s.id
          AND a."sessionId" IN (
            SELECT sess.id FROM "Session" sess
            WHERE sess."weekendId" = ${targetWeekendId}
            AND sess."sessionType" = 'CHAPEL'
          )
        WHERE a.id IS NULL
        ORDER BY c.name, s."fullName"
      `;
    }
  }

  // Calculate if weekend is over (after Sunday 23:59:59)
  let weekendOver = false;
  if (weekend) {
    const sundayEnd = new Date(weekend.saturdayDate);
    sundayEnd.setDate(sundayEnd.getDate() + 1);
    sundayEnd.setHours(23, 59, 59, 999);
    weekendOver = new Date() > sundayEnd;
  }

  return {
    totalCheckIns,
    totalStudents,
    checkInRate,
    byCourse,
    missedCheckIns: studentsWhoMissedChapel,
    weekendOver,
  };
}

/**
 * Get weekly check-in trends for charts
 */
export async function getCheckInTrends() {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can view check-in trends.");
  }

  // Get last 12 weekends
  const weekends = await prisma.weekend.findMany({
    orderBy: { saturdayDate: "desc" },
    take: 12,
    include: {
      checkIns: true,
    },
  });

  return weekends.reverse().map((weekend) => ({
    weekendName: weekend.name,
    saturdayDate: weekend.saturdayDate.toISOString(),
    saturdayCheckIns: weekend.checkIns.filter((c) => c.day === "SATURDAY").length,
    sundayCheckIns: weekend.checkIns.filter((c) => c.day === "SUNDAY").length,
    totalCheckIns: weekend.checkIns.length,
  }));
}
