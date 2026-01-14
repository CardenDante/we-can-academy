import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { RegisterStudentForm } from "./register-form";

export default async function RegisterPage() {
  const user = await getUser();
  if (!user || (user.role !== "CASHIER" && user.role !== "ADMIN")) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Register Student</h2>
          <p className="text-muted-foreground">Register a new student to the academy</p>
        </div>
        <RegisterStudentForm />
      </main>
    </div>
  );
}
