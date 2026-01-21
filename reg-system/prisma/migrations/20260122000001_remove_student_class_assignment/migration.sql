-- Drop the foreign key constraint
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_classId_fkey";

-- Drop the index
DROP INDEX IF EXISTS "Student_classId_idx";

-- Remove classId column from Student table
ALTER TABLE "Student" DROP COLUMN IF EXISTS "classId";
