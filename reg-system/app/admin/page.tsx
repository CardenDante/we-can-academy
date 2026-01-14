import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, GraduationCap, BookOpen, Calendar, ClipboardList, Settings } from "lucide-react";

export default async function AdminPage() {
  const user = await getUser();
  if (!user) return null;

  const cards = [
    {
      title: "Users",
      description: "Manage system users and roles",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Students",
      description: "View all registered students",
      href: "/admin/students",
      icon: GraduationCap,
    },
    {
      title: "Courses",
      description: "View available courses",
      href: "/admin/courses",
      icon: BookOpen,
    },
    {
      title: "Classes",
      description: "Manage class divisions (A, B, C)",
      href: "/admin/classes",
      icon: ClipboardList,
    },
    {
      title: "Weekends",
      description: "Manage academy weekends",
      href: "/admin/weekends",
      icon: Calendar,
    },
    {
      title: "Sessions",
      description: "Manage sessions and assignments",
      href: "/admin/sessions",
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8">Admin Dashboard</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-6 w-6 text-primary" />
                      <CardTitle>{card.title}</CardTitle>
                    </div>
                    <CardDescription>{card.description}</CardDescription>
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
