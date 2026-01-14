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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Gate Lookup</h2>
          <p className="text-muted-foreground">Scan barcode or NFC to view student information</p>
        </div>
        <SecurityClient />
      </main>
    </div>
  );
}
