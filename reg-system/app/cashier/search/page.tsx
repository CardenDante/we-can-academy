import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";
import { SearchStudentForm } from "./search-form";

export default async function SearchStudentsPage() {
  const user = await getUser();
  if (!user || (user.role !== "CASHIER" && user.role !== "ADMIN")) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/cashier" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
            Search Students
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Search for students by admission number
          </p>
        </div>

        <SearchStudentForm />
      </main>
    </div>
  );
}
