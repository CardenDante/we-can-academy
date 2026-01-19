-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "hasWarning" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "warnedAt" TIMESTAMP(3),
ADD COLUMN     "warningReason" TEXT;

-- CreateIndex
CREATE INDEX "Student_hasWarning_idx" ON "Student"("hasWarning");
