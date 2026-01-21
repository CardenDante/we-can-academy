import { prisma } from "../lib/prisma";
import { uploadToR2, generateProfilePictureKey } from "../lib/r2";
import { readFile, access } from "fs/promises";
import { join } from "path";

async function migrateToR2() {
  console.log("🚀 Starting migration to Cloudflare R2...\n");

  // Get all students with profile pictures
  const students = await prisma.student.findMany({
    where: {
      profilePicture: {
        not: null,
      },
    },
    select: {
      id: true,
      admissionNumber: true,
      fullName: true,
      profilePicture: true,
    },
  });

  // Filter only local files (not already migrated to R2)
  const localStudents = students.filter(
    (s) => s.profilePicture && s.profilePicture.startsWith("/uploads/")
  );

  const alreadyMigrated = students.length - localStudents.length;

  console.log(`📊 Migration Status:`);
  console.log(`   Total students with pictures: ${students.length}`);
  console.log(`   Already on R2: ${alreadyMigrated}`);
  console.log(`   To migrate: ${localStudents.length}\n`);

  if (localStudents.length === 0) {
    console.log("✅ No local files to migrate. All done!");
    return;
  }

  let migrated = 0;
  let failed = 0;
  const errors: Array<{ student: string; error: string }> = [];

  for (const student of localStudents) {
    try {
      // Read the local file
      const localPath = join(process.cwd(), "public", student.profilePicture!);

      // Check if file exists
      try {
        await access(localPath);
      } catch {
        console.log(
          `⚠️  File not found for ${student.fullName} (${student.admissionNumber}), skipping...`
        );
        failed++;
        errors.push({
          student: `${student.fullName} (${student.admissionNumber})`,
          error: "File not found on disk",
        });
        continue;
      }

      // Read file
      const fileBuffer = await readFile(localPath);

      // Convert to File object
      const file = new File([fileBuffer], `${student.id}.jpg`, {
        type: "image/jpeg",
      });

      // Upload to R2
      const r2Key = generateProfilePictureKey(student.id);
      const r2Url = await uploadToR2(file, r2Key);

      // Update database
      await prisma.student.update({
        where: { id: student.id },
        data: { profilePicture: r2Url },
      });

      migrated++;
      console.log(
        `✓ [${migrated}/${localStudents.length}] ${student.fullName} (${student.admissionNumber})`
      );
    } catch (error: any) {
      failed++;
      const errorMsg = error.message || "Unknown error";
      console.error(
        `✗ [${migrated + failed}/${localStudents.length}] ${student.fullName} (${student.admissionNumber}): ${errorMsg}`
      );
      errors.push({
        student: `${student.fullName} (${student.admissionNumber})`,
        error: errorMsg,
      });
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📈 Migration Complete!`);
  console.log(`${"=".repeat(60)}`);
  console.log(`✅ Successfully migrated: ${migrated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success rate: ${((migrated / localStudents.length) * 100).toFixed(1)}%\n`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors encountered:\n`);
    errors.forEach(({ student, error }, index) => {
      console.log(`${index + 1}. ${student}`);
      console.log(`   Error: ${error}\n`);
    });
  }

  if (migrated > 0) {
    console.log(`\n✅ Next steps:`);
    console.log(`   1. Verify images are accessible in R2 bucket`);
    console.log(`   2. Test image loading on the website`);
    console.log(`   3. Once confirmed, you can delete local files:`);
    console.log(`      rm -rf public/uploads/profile-pictures/`);
    console.log(`   4. Keep backups for 30 days before permanent deletion\n`);
  }
}

// Run migration
migrateToR2()
  .then(() => {
    console.log("✅ Migration script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed with error:", error);
    process.exit(1);
  });
