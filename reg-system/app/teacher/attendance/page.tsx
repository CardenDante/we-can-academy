import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TeacherAttendanceClient } from "./teacher-attendance-client";

export default async function TeacherAttendancePage() {
  const user = await getUser();
  if (!user || user.role !== "TEACHER") {
    redirect("/");
  }

  // Get teacher's class
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
    return (
      <div className="p-6">
        <Header
          title="Mark Attendance"
          description="Teacher profile not found"
        />
      </div>
    );
  }

  // Get current/recent weekends
  const weekends = await prisma.weekend.findMany({
    orderBy: { saturdayDate: "desc" },
    take: 10,
  });

  // Get all class sessions for this teacher's class
  const sessions = await prisma.session.findMany({
    where: {
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
    orderBy: [
      { weekend: { saturdayDate: "desc" } },
      { day: "asc" },
      { startTime: "asc" },
    ],
  });

  // Get students in teacher's class
  const students = await prisma.student.findMany({
    where: {
      classId: teacher.classId,
      isExpelled: false,
    },
    include: {
      course: true,
      class: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });

  return (
    <div className="p-6">
      <Header
        title="Mark Attendance"
        description={`${teacher.class.course.name} - ${teacher.class.name}`}
      />

      <TeacherAttendanceClient
        sessions={JSON.parse(JSON.stringify(sessions))}
        students={JSON.parse(JSON.stringify(students))}
        classId={teacher.classId}
      />
    </div>
  );
}
