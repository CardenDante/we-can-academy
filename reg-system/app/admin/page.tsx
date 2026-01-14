import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { Users, GraduationCap, BookOpen, Calendar, ClipboardList, Settings, ArrowRight } from "lucide-react";

export default async function AdminPage() {
  const user = await getUser();
  if (!user) return null;

  const cards = [
    {
      title: "Users",
      description: "Manage system users and roles",
      href: "/admin/users",
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Students",
      description: "View all registered students",
      href: "/admin/students",
      icon: GraduationCap,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Courses",
      description: "View available courses",
      href: "/admin/courses",
      icon: BookOpen,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Classes",
      description: "Manage class divisions (A, B, C)",
      href: "/admin/classes",
      icon: ClipboardList,
      color: "from-amber-500 to-amber-600",
    },
    {
      title: "Weekends",
      description: "Manage academy weekends",
      href: "/admin/weekends",
      icon: Calendar,
      color: "from-rose-500 to-rose-600",
    },
    {
      title: "Sessions",
      description: "Manage sessions and assignments",
      href: "/admin/sessions",
      icon: Settings,
      color: "from-indigo-500 to-indigo-600",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-light tracking-tight text-foreground mb-3">
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground font-light">
            Manage all aspects of the academy system
          </p>
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
                  <CardHeader className="pb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
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
