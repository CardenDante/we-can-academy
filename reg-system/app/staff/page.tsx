import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { AttendanceClient } from "./attendance-client";
import { Card, CardHeader } from "@/components/ui/card";
import { CheckCircle, Users, Church, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function StaffPage() {
  const user = await getUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    redirect("/");
  }

  // Fetch statistics
  const [totalAttendance, classAttendance, chapelAttendance, recentSessions] = await Promise.all([
    prisma.attendance.count(),
    prisma.attendance.count({
      where: {
        session: {
          sessionType: "CLASS",
        },
      },
    }),
    prisma.attendance.count({
      where: {
        session: {
          sessionType: "CHAPEL",
        },
      },
    }),
    prisma.session.count(),
  ]);

  // Get today's attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayAttendance = await prisma.attendance.count({
    where: {
      markedAt: {
        gte: today,
      },
    },
  });

  const statistics = [
    {
      title: "Today's Attendance",
      value: todayAttendance,
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: "Total Attendance",
      value: totalAttendance,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Class Attendance",
      value: classAttendance,
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
    {
      title: "Chapel Attendance",
      value: chapelAttendance,
      icon: Church,
      color: "text-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2 sm:mb-3">
            Attendance Management
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Mark student attendance for classes and chapel sessions
          </p>
        </div>

        {/* Statistics Row */}
        {/* <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8 sm:mb-12">
          {statistics.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="luxury-card border-0 overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-4 pt-6">
                  <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="text-3xl font-semibold tracking-tight mb-1">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground font-light">
                    {stat.title}
                  </p>
                </CardHeader>
              </Card>
            );
          })}
        </div> */}

        <AttendanceClient />
      </main>
    </div>
  );
}
