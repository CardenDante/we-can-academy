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
        <Header user={{ name: user.name || "Teacher", role: user.role }} />
        <div className="mt-6">
          <h2 className="text-2xl font-bold">Mark Attendance</h2>
          <p className="text-muted-foreground mt-2">Teacher profile not found</p>
        </div>
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

  // Get students in teacher's course
  const students = await prisma.student.findMany({
    where: {
      courseId: teacher.class.courseId,
      isExpelled: false,
    },
    include: {
      course: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });

  return (
    <div className="p-6">
      <Header user={{ name: user.name || "Teacher", role: user.role }} />
      <div className="mt-6">
        <h2 className="text-2xl font-bold">Mark Attendance</h2>
        <p className="text-muted-foreground mt-2">{`${teacher.class.course.name} - ${teacher.class.name}`}</p>
      </div>

      <TeacherAttendanceClient
        sessions={JSON.parse(JSON.stringify(sessions))}
        students={JSON.parse(JSON.stringify(students))}
        classId={teacher.classId}
        courseId={teacher.class.courseId}
      />
    </div>
  );
}
