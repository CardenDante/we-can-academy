import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "./analytics-client";
import { getCheckInStats, getCheckInTrends } from "@/app/actions/checkin";
import { prisma } from "@/lib/prisma";

export default async function AnalyticsPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  // Get check-in stats for current weekend
  const checkInStats = await getCheckInStats();

  // Get check-in trends for last 12 weekends
  const checkInTrends = await getCheckInTrends();

  // Get chapel attendance stats
  const chapelAttendanceStats = await getChapelAttendanceStats();

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
            Analytics Dashboard
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            View attendance and check-in analytics across weekends and courses
          </p>
        </div>

        <AnalyticsClient
          checkInStats={checkInStats}
          checkInTrends={checkInTrends}
          chapelAttendanceStats={chapelAttendanceStats}
        />
      </main>
    </div>
  );
}

async function getChapelAttendanceStats() {
  // Get last 12 weekends with chapel attendance data
  const weekends = await prisma.weekend.findMany({
    take: 12,
    orderBy: { saturdayDate: "desc" },
    include: {
      sessions: {
        where: { sessionType: "CHAPEL" },
        include: {
          attendances: {
            include: {
              student: {
                include: { course: true },
              },
            },
          },
        },
      },
    },
  });

  return weekends.map((weekend) => {
    const totalAttendances = weekend.sessions.reduce(
      (sum, session) => sum + session.attendances.length,
      0
    );

    // Count attendances by course
    const courseAttendances: Record<string, { name: string; count: number }> = {};
    weekend.sessions.forEach((session) => {
      session.attendances.forEach((attendance) => {
        const courseName = attendance.student.course.name;
        if (!courseAttendances[courseName]) {
          courseAttendances[courseName] = { name: courseName, count: 0 };
        }
        courseAttendances[courseName].count++;
      });
    });

    return {
      weekendName: weekend.name,
      saturdayDate: weekend.saturdayDate.toISOString(),
      totalAttendances,
      courseBreakdown: Object.values(courseAttendances),
    };
  }).reverse(); // Oldest to newest for chart
}
