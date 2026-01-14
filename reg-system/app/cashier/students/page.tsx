import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Search Students</h2>
          <p className="text-muted-foreground">Search for students by admission number</p>
        </div>
        <SearchStudentForm />
      </main>
    </div>
  );
}
