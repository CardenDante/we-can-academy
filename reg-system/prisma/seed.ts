import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

// For seeding, we need to use the direct TCP connection
const directUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: directUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const courses = [
  "AI",
  "Art",
  "Automotive",
  "Camera Operation",
  "Carpentry",
  "Catering",
  "Chinese",
  "Computer",
  "Computer Packages",
  "Cosmetology",
  "Digital Marketing",
  "Driving",
  "Electrical",
  "English",
  "Fashion and Design",
  "French",
  "German",
  "Graphic Design",
  "Korean",
  "Mind Education",
  "Music",
  "Networking",
  "Paramedics",
  "Plumbing",
  "Programming",
  "Sign Language",
  "Theology",
  "TV Production",
  "UX Design",
  "Video Editing",
  "Welding",
];

async function main() {
  console.log("Seeding database...");

  // Create courses
  for (const courseName of courses) {
    await prisma.course.upsert({
      where: { name: courseName },
      update: {},
      create: { name: courseName },
    });
  }
  console.log(`Created ${courses.length} courses`);

  // Create admin user
  const hashedPassword = await bcrypt.hash("James 1:4-6", 10);
  await prisma.user.upsert({
    where: { username: "Wecan" },
    update: {},
    create: {
      username: "Wecan",
      password: hashedPassword,
      name: "System Administrator",
      role: "ADMIN",
    },
  });
  console.log("Created admin user (username: Wecan, password: James 1:4-6)");

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
