import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function Home() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  switch (user.role) {
    case "ADMIN":
      redirect("/admin");
    case "CASHIER":
      redirect("/cashier");
    case "STAFF":
      redirect("/staff");
    case "SECURITY":
      redirect("/security");
    default:
      redirect("/login");
  }
}
