"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can view the user list.");
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
    throw new Error("Only administrators can create new users.");
  }

  // Check if username already exists
  const existingUser = await prisma.user.findUnique({
    where: { username: data.username },
  });

  if (existingUser) {
    throw new Error(
      `The username "${data.username}" is already taken. Please choose a different username.`
    );
  }

  // Validate password strength
  if (data.password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  try {
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
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("This username is already registered. Please use a different one.");
    }
    throw new Error("Failed to create user. Please try again.");
  }
}

export async function deleteUser(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can delete users.");
  }

  // Prevent self-deletion
  if (currentUser.id === id) {
    throw new Error("You cannot delete your own account while logged in.");
  }

  // Get the user being deleted for better error messages
  const userToDelete = await prisma.user.findUnique({
    where: { id },
    select: { name: true, username: true },
  });

  if (!userToDelete) {
    throw new Error("User not found. They may have already been deleted.");
  }

  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/users");
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("This user was already deleted or doesn't exist.");
    }
    throw new Error(`Failed to delete user "${userToDelete.name}". Please try again.`);
  }
}
