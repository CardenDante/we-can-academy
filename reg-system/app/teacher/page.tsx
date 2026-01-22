import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Users, CheckCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function TeacherPage() {
  const user = await getUser();
  if (!user || user.role !== "TEACHER") {
    redirect("/");
  }

  // Get teacher's information
  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    include: {
      class: {
        include: {
          course: {
            include: {
              _count: {
                select: {
                  students: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={{ name: user.name || "Teacher", role: user.role }} />
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
              Teacher Dashboard
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground font-light">
              Teacher profile not found
            </p>
          </div>
          <div className="text-center text-muted-foreground">
            Your teacher profile could not be found. Please contact an administrator.
          </div>
        </main>
      </div>
    );
  }


  // Get today's class attendance marked by this teacher
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayAttendance = await prisma.attendance.count({
    where: {
      markedAt: {
        gte: today,
      },
      classId: teacher.classId,
      markedBy: user.name || undefined,
    },
  });

  const statistics = [
    {
      title: "Course Students",
      value: teacher.class.course._count.students,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      href: "/teacher/students",
    },
    {
      title: "Today's Attendance",
      value: todayAttendance,
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      href: "/teacher/attendance",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name || "Teacher", role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
            Welcome, {user.name}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            {`${teacher.class.course.name} - ${teacher.class.name}`}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
        {statistics.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} href={stat.href}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Link href="/teacher/attendance">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Mark Attendance</h3>
                    <p className="text-sm text-muted-foreground">
                      Mark class attendance for your students
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/teacher/students">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">My Students</h3>
                    <p className="text-sm text-muted-foreground">
                      View all students in your class
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
