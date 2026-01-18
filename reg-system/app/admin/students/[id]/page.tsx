import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";
import { getStudentByIdWithHistory } from "@/app/actions/students";
import { StudentDetailClient } from "./student-detail-client";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;
  const student = await getStudentByIdWithHistory(id);

  if (!student) {
    redirect("/admin/students");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin/students" />

        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2">
            Student Details & Analytics
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            View complete profile, attendance records, and analytics for {student.fullName}
          </p>
        </div>

        <StudentDetailClient student={student} />
      </main>
    </div>
  );
}
