import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TeacherAttendanceClient } from "./teacher-attendance-client";
import { BackButton } from "@/components/back-button";

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
      <div className="min-h-screen bg-background">
        <Header user={{ name: user.name || "Teacher", role: user.role }} />
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <BackButton href="/teacher" />

          <div className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
              Mark Attendance
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground font-light">
              Teacher profile not found
            </p>
          </div>
        </main>
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
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name || "Teacher", role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/teacher" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
            Mark Attendance
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            {`${teacher.class.course.name} - ${teacher.class.name}`}
          </p>
        </div>

        <TeacherAttendanceClient
          sessions={JSON.parse(JSON.stringify(sessions))}
          students={JSON.parse(JSON.stringify(students))}
          classId={teacher.classId}
          courseId={teacher.class.courseId}
        />
      </main>
    </div>
  );
}
