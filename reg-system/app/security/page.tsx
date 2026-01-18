import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { SecurityClient } from "./security-client";

export default async function SecurityPage() {
  const user = await getUser();
  if (!user || (user.role !== "SECURITY" && user.role !== "ADMIN")) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <SecurityClient />
      </main>
    </div>
  );
}
