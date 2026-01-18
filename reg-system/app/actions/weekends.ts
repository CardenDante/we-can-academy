"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getWeekends() {
  return await prisma.weekend.findMany({
    include: {
      _count: {
        select: {
          sessions: true,
        },
      },
    },
    orderBy: { saturdayDate: "desc" },
  });
}

export async function createWeekend(data: {
  saturdayDate: string;
  name: string;
}) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can create weekends.");
  }

  // Check if a weekend already exists for this date
  const existingWeekend = await prisma.weekend.findUnique({
    where: { saturdayDate: new Date(data.saturdayDate) },
  });

  if (existingWeekend) {
    const formattedDate = new Date(data.saturdayDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    throw new Error(
      `A weekend already exists for ${formattedDate}. ` +
      `The existing weekend is named "${existingWeekend.name}".`
    );
  }

  try {
    await prisma.weekend.create({
      data: {
        saturdayDate: new Date(data.saturdayDate),
        name: data.name,
      },
    });
    revalidatePath("/admin/weekends");
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("A weekend for this date already exists. Please choose a different date.");
    }
    throw new Error("Failed to create weekend. Please try again.");
  }
}

export async function deleteWeekend(id: string) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Only administrators can delete weekends.");
  }

  // Get the weekend with its sessions and attendance count
  const weekend = await prisma.weekend.findUnique({
    where: { id },
    include: {
      sessions: {
        include: {
          _count: {
            select: { attendances: true },
          },
        },
      },
    },
  });

  if (!weekend) {
    throw new Error("Weekend not found. It may have already been deleted.");
  }

  // Check if any sessions have attendance records
  const hasAttendance = weekend.sessions.some((session) => session._count.attendances > 0);

  if (hasAttendance) {
    throw new Error(
      `Cannot delete "${weekend.name}" because it has attendance records. ` +
      `Please delete the attendance records first if you need to remove this weekend.`
    );
  }

  try {
    await prisma.weekend.delete({
      where: { id },
    });
    revalidatePath("/admin/weekends");
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("This weekend was already deleted.");
    }
    throw new Error(`Failed to delete "${weekend.name}". Please try again.`);
  }
}
