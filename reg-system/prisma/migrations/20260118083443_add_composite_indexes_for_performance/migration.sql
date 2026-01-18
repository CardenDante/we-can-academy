-- Add composite indexes for optimized query performance
-- These indexes significantly improve performance for 100+ concurrent users

-- CheckIn table composite indexes
DO $$
BEGIN
    -- For getTodayCheckIns() - filter by weekend+day, order by time
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='CheckIn' AND indexname='CheckIn_weekendId_day_checkedAt_idx') THEN
        CREATE INDEX "CheckIn_weekendId_day_checkedAt_idx" ON "CheckIn"("weekendId", "day", "checkedAt");
    END IF;

    -- For chapel attendance verification - check if student checked in this weekend
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='CheckIn' AND indexname='CheckIn_studentId_weekendId_idx') THEN
        CREATE INDEX "CheckIn_studentId_weekendId_idx" ON "CheckIn"("studentId", "weekendId");
    END IF;
END $$;

-- Attendance table composite indexes
DO $$
BEGIN
    -- For getAttendanceBySession() with class filter
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='Attendance' AND indexname='Attendance_sessionId_classId_idx') THEN
        CREATE INDEX "Attendance_sessionId_classId_idx" ON "Attendance"("sessionId", "classId");
    END IF;

    -- For getAttendanceBySession() ordered by time
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='Attendance' AND indexname='Attendance_sessionId_markedAt_idx') THEN
        CREATE INDEX "Attendance_sessionId_markedAt_idx" ON "Attendance"("sessionId", "markedAt");
    END IF;

    -- For student attendance history ordered by date
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='Attendance' AND indexname='Attendance_studentId_markedAt_idx') THEN
        CREATE INDEX "Attendance_studentId_markedAt_idx" ON "Attendance"("studentId", "markedAt");
    END IF;
END $$;

-- Session table composite indexes
DO $$
BEGIN
    -- For finding chapel sessions by weekend
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='Session' AND indexname='Session_weekendId_sessionType_idx') THEN
        CREATE INDEX "Session_weekendId_sessionType_idx" ON "Session"("weekendId", "sessionType");
    END IF;

    -- For finding sessions on specific days of a weekend
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='Session' AND indexname='Session_weekendId_day_idx') THEN
        CREATE INDEX "Session_weekendId_day_idx" ON "Session"("weekendId", "day");
    END IF;

    -- For filtering chapel sessions by day across weekends
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='Session' AND indexname='Session_sessionType_day_idx') THEN
        CREATE INDEX "Session_sessionType_day_idx" ON "Session"("sessionType", "day");
    END IF;
END $$;
