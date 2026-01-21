import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  uploadToR2,
  deleteFromR2,
  extractR2Key,
  generateProfilePictureKey,
} from "@/lib/r2";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg"];

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const user = await getUser();
    if (!user || (user.role !== "CASHIER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const studentId = formData.get("studentId") as string;

    if (!file || !studentId) {
      return NextResponse.json(
        { error: "Missing file or studentId" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG and PNG are allowed" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Delete old profile picture if exists
    if (student.profilePicture) {
      try {
        const oldKey = extractR2Key(student.profilePicture);
        await deleteFromR2(oldKey);
      } catch (error) {
        // Ignore error if file doesn't exist
        console.log("Old file not found or failed to delete, continuing...");
      }
    }

    // Generate R2 key and upload file
    const r2Key = generateProfilePictureKey(studentId);
    const profilePictureUrl = await uploadToR2(file, r2Key);

    // Update database with new profile picture URL
    await prisma.student.update({
      where: { id: studentId },
      data: { profilePicture: profilePictureUrl },
    });

    return NextResponse.json({
      success: true,
      profilePictureUrl,
    });
  } catch (error: any) {
    console.error("Profile picture upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload profile picture" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and authorization
    const user = await getUser();
    if (!user || (user.role !== "CASHIER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Missing studentId" },
        { status: 400 }
      );
    }

    // Get student with profile picture
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Delete file from R2 if exists
    if (student.profilePicture) {
      try {
        const r2Key = extractR2Key(student.profilePicture);
        await deleteFromR2(r2Key);
      } catch (error) {
        console.log("File not found or failed to delete, continuing...");
      }
    }

    // Update database
    await prisma.student.update({
      where: { id: studentId },
      data: { profilePicture: null },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Profile picture delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete profile picture" },
      { status: 500 }
    );
  }
}
