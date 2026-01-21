import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { TeachersClient } from "./teachers-client";
import { getTeachers } from "@/app/actions/teachers";
import { getClasses } from "@/app/actions/classes";

export default async function AdminTeachersPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const [teachersResult, classes] = await Promise.all([
    getTeachers(),
    getClasses(),
  ]);

  const teachers = teachersResult.success ? teachersResult.data || [] : [];

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2">
            Manage Teachers
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Create and manage teacher accounts and class assignments
          </p>
        </div>

        <TeachersClient
          initialTeachers={JSON.parse(JSON.stringify(teachers))}
          classes={JSON.parse(JSON.stringify(classes))}
        />
      </main>
    </div>
  );
}
