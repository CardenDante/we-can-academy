-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "churchDistrict" TEXT NOT NULL DEFAULT 'Church';

-- CreateIndex
CREATE INDEX "Student_churchDistrict_idx" ON "Student"("churchDistrict");
