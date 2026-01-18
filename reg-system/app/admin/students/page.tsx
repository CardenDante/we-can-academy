import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { getStudents } from "@/app/actions/students";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";
import { StudentsClient } from "./students-client";

export default async function StudentsPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const students = await getStudents();

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
            Student Management
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Manage student registrations, expulsions, and view all registered students
          </p>
        </div>

        <StudentsClient students={students} />
      </main>
    </div>
  );
}
