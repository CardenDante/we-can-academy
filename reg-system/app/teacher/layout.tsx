import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();

  if (!user || user.role !== "TEACHER") {
    redirect("/");
  }

  return <>{children}</>;
}
