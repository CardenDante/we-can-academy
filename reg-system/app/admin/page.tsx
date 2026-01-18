import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { Users, GraduationCap, BookOpen, Calendar, ClipboardList, Settings, ArrowRight, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const user = await getUser();
  if (!user) return null;

  // Fetch statistics - Classes commented out (chapel-only mode)
  const [
    totalStudents,
    totalUsers,
    totalCourses,
    // totalClasses, // Commented out - class features disabled
    totalWeekends,
    totalSessions,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.user.count(),
    prisma.course.count(),
    // prisma.class.count(), // Commented out - class features disabled
    prisma.weekend.count(),
    prisma.session.count({
      where: {
        sessionType: "CHAPEL", // Only count chapel sessions
      },
    }),
  ]);

  const statistics = [
    {
      title: "Total Students",
      value: totalStudents,
      icon: GraduationCap,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Total Courses",
      value: totalCourses,
      icon: BookOpen,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    },
    /* Commented out - class features disabled
    {
      title: "Total Classes",
      value: totalClasses,
      icon: ClipboardList,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
    },
    */
    {
      title: "Total Weekends",
      value: totalWeekends,
      icon: Calendar,
      color: "text-rose-500",
      bgColor: "bg-rose-50 dark:bg-rose-950/20",
    },
    {
      title: "Chapel Sessions",
      value: totalSessions,
      icon: Settings,
      color: "text-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    },
  ];

  const cards = [
    {
      title: "Users",
      description: "Manage system users and roles",
      href: "/admin/users",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Students",
      description: "View all registered students",
      href: "/admin/students",
      icon: GraduationCap,
      color: "text-purple-500",
    },
    {
      title: "Courses",
      description: "View available courses",
      href: "/admin/courses",
      icon: BookOpen,
      color: "text-emerald-500",
    },
    /* Commented out - class features disabled
    {
      title: "Classes",
      description: "Manage class divisions (A, B, C)",
      href: "/admin/classes",
      icon: ClipboardList,
      color: "text-amber-500",
    },
    */
    {
      title: "Weekends",
      description: "Manage academy weekends",
      href: "/admin/weekends",
      icon: Calendar,
      color: "text-rose-500",
    },
    {
      title: "Chapel Sessions",
      description: "Manage chapel sessions",
      href: "/admin/sessions",
      icon: Settings,
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-xl font-medium tracking-tight uppercase text-foreground mb-3">
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground font-light">
            Manage all aspects of the academy system
          </p>
        </div>

        {/* Statistics Row */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-12">
          {statistics.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="luxury-card border-0 overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-4 pt-6">
                  <div className={`w-12 h-12 rounded ${stat.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight mb-1">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground font-light">
                    {stat.title}
                  </p>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="luxury-card border-0 h-full overflow-hidden group-hover:border-primary/20 transition-all duration-300">
                  <CardHeader className="pb-6 pt-8">
                    <div className="flex items-start justify-between mb-6">
                      <Icon className={`h-10 w-10 ${card.color} group-hover:scale-110 transition-transform duration-300`} />
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <h3 className="text-xl font-medium tracking-tight mb-2">
                      {card.title}
                    </h3>
                    <p className="text-sm text-muted-foreground font-light leading-relaxed">
                      {card.description}
                    </p>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}