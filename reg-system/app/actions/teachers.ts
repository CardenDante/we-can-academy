"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { hash } from "bcryptjs";

/**
 * Create a new teacher user and assign them to a class
 * Only ADMIN can create teachers
 */
export async function createTeacher(data: {
  username: string;
  password: string;
  name: string;
  classId: string;
}) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUser) {
      return { success: false, error: "Username already exists" };
    }

    // Validate class exists
    const classExists = await prisma.class.findUnique({
      where: { id: data.classId },
    });

    if (!classExists) {
      return { success: false, error: "Class not found" };
    }

    // Validate password
    if (data.password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters",
      };
    }

    // Hash password
    const hashedPassword = await hash(data.password, 10);

    // Create user and teacher in a transaction
    const teacher = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: data.username,
          password: hashedPassword,
          name: data.name,
          role: "TEACHER",
        },
      });

      const newTeacher = await tx.teacher.create({
        data: {
          userId: newUser.id,
          classId: data.classId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              role: true,
            },
          },
          class: {
            include: {
              course: true,
            },
          },
        },
      });

      return newTeacher;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/teachers");
    return { success: true, data: teacher };
  } catch (error) {
    console.error("Error creating teacher:", error);
    return { success: false, error: "Failed to create teacher" };
  }
}

/**
 * Get all teachers with their assigned classes
 * Only ADMIN can view all teachers
 */
export async function getTeachers() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        class: {
          include: {
            course: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: teachers };
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return { success: false, error: "Failed to fetch teachers" };
  }
}

/**
 * Get teacher by user ID (for logged-in teacher)
 */
export async function getTeacherByUserId(userId: string) {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Teachers can only view their own data, admins can view any teacher
  if (user.role !== "ADMIN" && user.id !== userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
          },
        },
        class: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!teacher) {
      return { success: false, error: "Teacher not found" };
    }

    return { success: true, data: teacher };
  } catch (error) {
    console.error("Error fetching teacher:", error);
    return { success: false, error: "Failed to fetch teacher" };
  }
}

/**
 * Update teacher's assigned class
 * Only ADMIN can update teacher assignments
 */
export async function updateTeacherClass(teacherId: string, classId: string) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Validate class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      return { success: false, error: "Class not found" };
    }

    const teacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: { classId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
          },
        },
        class: {
          include: {
            course: true,
          },
        },
      },
    });

    revalidatePath("/admin/teachers");
    return { success: true, data: teacher };
  } catch (error) {
    console.error("Error updating teacher:", error);
    return { success: false, error: "Failed to update teacher" };
  }
}

/**
 * Delete a teacher (and their user account)
 * Only ADMIN can delete teachers
 */
export async function deleteTeacher(teacherId: string) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get teacher to find user ID
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return { success: false, error: "Teacher not found" };
    }

    // Delete user (will cascade delete teacher due to onDelete: Cascade)
    await prisma.user.delete({
      where: { id: teacher.userId },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/teachers");
    return { success: true };
  } catch (error) {
    console.error("Error deleting teacher:", error);
    return { success: false, error: "Failed to delete teacher" };
  }
}

/**
 * Get students in teacher's course
 * Teachers can view all students in their course (not restricted to specific class)
 * This allows any student in the course to attend any class session
 */
export async function getTeacherStudents() {
  const user = await getUser();
  if (!user || user.role !== "TEACHER") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get teacher's class and course
    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
      include: {
        class: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!teacher) {
      return { success: false, error: "Teacher profile not found" };
    }

    // Get all students in the teacher's COURSE (not restricted to specific class)
    const students = await prisma.student.findMany({
      where: {
        courseId: teacher.class.courseId,
        isExpelled: false, // Only show active students
      },
      include: {
        course: true,
      },
      orderBy: {
        fullName: "asc",
      },
    });

    return { success: true, data: students };
  } catch (error) {
    console.error("Error fetching teacher students:", error);
    return { success: false, error: "Failed to fetch students" };
  }
}

/**
 * Get teacher's class sessions for a specific weekend
 * Teachers can view their class sessions
 */
export async function getTeacherSessions(weekendId: string) {
  const user = await getUser();
  if (!user || user.role !== "TEACHER") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get teacher's class
    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
    });

    if (!teacher) {
      return { success: false, error: "Teacher profile not found" };
    }

    // Get sessions for the teacher's class in the specified weekend
    const sessions = await prisma.session.findMany({
      where: {
        weekendId,
        sessionType: "CLASS",
        sessionClasses: {
          some: {
            classId: teacher.classId,
          },
        },
      },
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
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });

    return { success: true, data: sessions };
  } catch (error) {
    console.error("Error fetching teacher sessions:", error);
    return { success: false, error: "Failed to fetch sessions" };
  }
}

/**
 * Get student details for teacher (only if student is in teacher's course)
 */
export async function getTeacherStudentById(studentId: string) {
  const user = await getUser();
  if (!user || user.role !== "TEACHER") {
    throw new Error("Unauthorized");
  }

  // Get teacher's class and course
  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    include: {
      class: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!teacher) {
    throw new Error("Teacher profile not found");
  }

  // Get student and verify they're in the teacher's course
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      course: true,
      attendances: {
        where: {
          classId: teacher.classId, // Only class attendance from this teacher's class
        },
        include: {
          session: {
            include: {
              weekend: true,
            },
          },
        },
        orderBy: { markedAt: "desc" },
        take: 50,
      },
      checkIns: {
        include: {
          weekend: true,
        },
        orderBy: { checkedAt: "desc" },
        take: 30,
      },
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  // Verify student is in teacher's COURSE (not restricted to specific class)
  if (student.courseId !== teacher.class.courseId) {
    throw new Error("You can only view students in your course");
  }

  // Fetch weekends for attendance passport
  const weekends = await prisma.weekend.findMany({
    orderBy: { saturdayDate: "asc" },
  });

  return {
    ...student,
    weekends,
  };
}
