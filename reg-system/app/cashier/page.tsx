import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { UserPlus, Search } from "lucide-react";
import { redirect } from "next/navigation";

export default async function CashierPage() {
  const user = await getUser();
  if (!user || (user.role !== "CASHIER" && user.role !== "ADMIN")) {
    redirect("/");
  }

  const cards = [
    {
      title: "Register Student",
      description: "Register a new student to the academy",
      href: "/cashier/register",
      icon: UserPlus,
    },
    {
      title: "Search Students",
      description: "Search students by admission number",
      href: "/cashier/students",
      icon: Search,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8">Cashier Dashboard</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-3xl">
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
