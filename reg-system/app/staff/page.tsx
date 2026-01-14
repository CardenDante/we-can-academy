import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { AttendanceClient } from "./attendance-client";

export default async function StaffPage() {
  const user = await getUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Mark Attendance</h2>
          <p className="text-muted-foreground">Mark student attendance for classes and chapel</p>
        </div>
        <AttendanceClient />
      </main>
    </div>
  );
}
