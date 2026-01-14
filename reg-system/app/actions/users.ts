"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function createUser(data: {
  username: string;
  password: string;
  name: string;
  role: "ADMIN" | "CASHIER" | "STAFF" | "SECURITY";
}) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
      name: data.name,
      role: data.role,
    },
  });

  revalidatePath("/admin/users");
  return user;
}

export async function deleteUser(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}
