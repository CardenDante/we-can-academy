-- Add columns to Student table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Student' AND column_name='isExpelled') THEN
        ALTER TABLE "Student" ADD COLUMN "isExpelled" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Student' AND column_name='expelledAt') THEN
        ALTER TABLE "Student" ADD COLUMN "expelledAt" TIMESTAMP(3);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Student' AND column_name='expelledReason') THEN
        ALTER TABLE "Student" ADD COLUMN "expelledReason" TEXT;
    END IF;
END $$;

-- Create CheckIn table if it doesn't exist
CREATE TABLE IF NOT EXISTS "CheckIn" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weekendId" TEXT NOT NULL,
    "day" "DayOfWeekend" NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedBy" TEXT NOT NULL,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='Student' AND indexname='Student_isExpelled_idx') THEN
        CREATE INDEX "Student_isExpelled_idx" ON "Student"("isExpelled");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='CheckIn' AND indexname='CheckIn_studentId_idx') THEN
        CREATE INDEX "CheckIn_studentId_idx" ON "CheckIn"("studentId");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='CheckIn' AND indexname='CheckIn_weekendId_idx') THEN
        CREATE INDEX "CheckIn_weekendId_idx" ON "CheckIn"("weekendId");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='CheckIn' AND indexname='CheckIn_day_idx') THEN
        CREATE INDEX "CheckIn_day_idx" ON "CheckIn"("day");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='CheckIn' AND indexname='CheckIn_checkedAt_idx') THEN
        CREATE INDEX "CheckIn_checkedAt_idx" ON "CheckIn"("checkedAt");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='CheckIn' AND indexname='CheckIn_studentId_weekendId_day_key') THEN
        CREATE UNIQUE INDEX "CheckIn_studentId_weekendId_day_key" ON "CheckIn"("studentId", "weekendId", "day");
    END IF;
END $$;

-- Add foreign keys if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name='CheckIn_studentId_fkey'
        AND table_name='CheckIn'
    ) THEN
        ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name='CheckIn_weekendId_fkey'
        AND table_name='CheckIn'
    ) THEN
        ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_weekendId_fkey"
        FOREIGN KEY ("weekendId") REFERENCES "Weekend"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
