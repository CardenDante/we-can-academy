import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { UserPlus, Search, ArrowRight } from "lucide-react";
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
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Search Students",
      description: "Search students by admission number",
      href: "/cashier/students",
      icon: Search,
      color: "from-blue-500 to-blue-600",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-light tracking-tight text-foreground mb-3">
            Cashier Dashboard
          </h2>
          <p className="text-muted-foreground font-light">
            Register and manage student records
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
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
                  <CardHeader className="pb-8 pt-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${card.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <h3 className="text-2xl font-medium tracking-tight mb-2">
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
