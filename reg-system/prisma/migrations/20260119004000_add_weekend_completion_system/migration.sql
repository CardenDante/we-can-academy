-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('PRESENT', 'MISSED');

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN "status" "CheckInStatus" NOT NULL DEFAULT 'PRESENT';

-- AlterTable
ALTER TABLE "Weekend" ADD COLUMN "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "completedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CheckIn_status_idx" ON "CheckIn"("status");

-- CreateIndex
CREATE INDEX "Weekend_isCompleted_idx" ON "Weekend"("isCompleted");
