import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { UserPlus, Search, ArrowRight, GraduationCap, BookOpen, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function CashierPage() {
  const user = await getUser();
  if (!user || (user.role !== "CASHIER" && user.role !== "ADMIN")) {
    redirect("/");
  }

  // Fetch statistics
  const [totalStudents, totalCourses] = await Promise.all([
    prisma.student.count(),
    prisma.course.count(),
  ]);

  // Get today's registrations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRegistrations = await prisma.student.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  const statistics = [
    {
      title: "Total Students",
      value: totalStudents,
      icon: GraduationCap,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
    {
      title: "Today's Registrations",
      value: todayRegistrations,
      icon: UserPlus,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: "Available Courses",
      value: totalCourses,
      icon: BookOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
  ];

  const cards = [
    {
      title: "Register Student",
      description: "Register a new student to the academy",
      href: "/cashier/register",
      icon: UserPlus,
      color: "text-emerald-500",
    },
    {
      title: "View Students",
      description: "View all registered students",
      href: "/cashier/students",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Search Students",
      description: "Search students by admission number",
      href: "/cashier/search",
      icon: Search,
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
            Cashier Dashboard
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Register and manage student records
          </p>
        </div>

        {/* Statistics Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8 sm:mb-12">
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

        {/* Action Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
