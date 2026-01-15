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
    <div className="min-h-screen bg-muted/30">
      <Header user={{ name: user.name!, role: user.role }} />
      
      {/* bg-grid-black/[0.02] creates a very subtle texture if you have that utility, 
        otherwise it falls back to a clean gray background 
      */}
      <main className="container max-w-5xl mx-auto px-4 py-12 flex justify-center">
        <RegisterStudentForm />
      </main>
    </div>
  );
}