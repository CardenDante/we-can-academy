-- AlterEnum: Add TEACHER to Role enum
ALTER TYPE "Role" ADD VALUE 'TEACHER';

-- AlterTable: Add teacher relation to User (nullable, no schema change needed)

-- CreateTable: Teacher model
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add classId to Student (optional field)
ALTER TABLE "Student" ADD COLUMN "classId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE INDEX "Teacher_userId_idx" ON "Teacher"("userId");

-- CreateIndex
CREATE INDEX "Teacher_classId_idx" ON "Teacher"("classId");

-- CreateIndex
CREATE INDEX "Student_classId_idx" ON "Student"("classId");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
