import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Initialize R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

/**
 * Upload a file to Cloudflare R2
 * @param file - The file to upload
 * @param key - The key/path for the file in R2
 * @returns The public URL of the uploaded file
 */
export async function uploadToR2(file: File, key: string): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    });

    await r2Client.send(command);

    // Return the public URL
    return `${PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error("Failed to upload file to R2");
  }
}

/**
 * Delete a file from Cloudflare R2
 * @param key - The key/path of the file to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw new Error("Failed to delete file from R2");
  }
}

/**
 * Extract the R2 key from a full URL
 * @param url - The full URL or relative path
 * @returns The R2 key
 */
export function extractR2Key(url: string): string {
  if (url.startsWith(PUBLIC_URL)) {
    return url.replace(`${PUBLIC_URL}/`, "");
  }
  // Handle old local URLs (for migration)
  if (url.startsWith("/uploads/")) {
    return url.replace("/uploads/", "");
  }
  return url;
}

/**
 * Generate a unique key for profile pictures
 * @param studentId - The student ID
 * @returns The key for storing the profile picture
 */
export function generateProfilePictureKey(studentId: string): string {
  return `profile-pictures/${studentId}.jpg`;
}
