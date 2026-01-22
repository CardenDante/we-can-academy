"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { markAttendance, getAttendanceBySession } from "@/app/actions/attendance";
import { getStudentByAdmissionWithHistory } from "@/app/actions/students";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
} from "lucide-react";
import { ProfilePictureDisplay } from "@/components/profile-picture";
import { MultiScanner } from "@/components/multi-scanner";
import { AttendancePassport } from "@/components/attendance-passport";

interface TeacherAttendanceClientProps {
  sessions: any[];
  students: any[];
  classId: string;
  courseId: string;
}

export function TeacherAttendanceClient({
  sessions,
  students,
  classId,
  courseId,
}: TeacherAttendanceClientProps) {
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessionError, setSessionError] = useState("");
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    student?: any;
  } | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  const [attendanceCount, setAttendanceCount] = useState(0);

  // Auto-detect current session based on date and time
  function detectCurrentSession(allSessions: any[]) {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find session that matches current day and time
    for (const session of allSessions) {
      const sessionDate = new Date(session.weekend.saturdayDate);
      if (session.day === "SUNDAY") {
        sessionDate.setDate(sessionDate.getDate() + 1);
      }
      sessionDate.setHours(0, 0, 0, 0);

      // Check if session is today
      if (sessionDate.getTime() === today.getTime()) {
        // Parse start and end times
        const [startHour, startMin] = session.startTime.split(":").map(Number);
        const [endHour, endMin] = session.endTime.split(":").map(Number);

        const sessionStart = new Date(today);
        sessionStart.setHours(startHour, startMin, 0, 0);

        const sessionEnd = new Date(today);
        sessionEnd.setHours(endHour, endMin, 0, 0);

        // Handle sessions that cross midnight
        if (sessionEnd <= sessionStart) {
          sessionEnd.setDate(sessionEnd.getDate() + 1);
        }

        // Check if current time is within session time
        if (now >= sessionStart && now <= sessionEnd) {
          return session;
        }
      }
    }

    return null;
  }

  useEffect(() => {
    // Auto-detect current session on mount
    const detected = detectCurrentSession(sessions);
    if (detected) {
      setCurrentSession(detected);
      setSessionError("");
      loadAttendanceCount(detected.id);
    } else {
      setCurrentSession(null);
      setSessionError("No active class session at this time. Attendance can only be marked during scheduled session times.");
    }
  }, [sessions]);

  async function loadAttendanceCount(sessionId: string) {
    try {
      const data = await getAttendanceBySession(sessionId);
      setAttendanceCount(data.length);
    } catch (err) {
      console.error("Failed to load attendance count:", err);
    }
  }

  const handleScan = useCallback(async (value: string) => {
    if (!value || value === lastScanned) return;

    if (!currentSession) {
      setScanResult({
        success: false,
        message: "No active session - cannot mark attendance outside session time",
      });
      setStudentData(null);
      return;
    }

    setLoading(true);
    setLastScanned(value);

    try {
      // Get student info first
      const student = await getStudentByAdmissionWithHistory(value.trim());

      if (!student) {
        setScanResult({
          success: false,
          message: "Student not found",
        });
        setStudentData(null);
        setLoading(false);
        setTimeout(() => setLastScanned(""), 2000);
        return;
      }

      setStudentData(student);

      // Verify student is in this course
      if (student.courseId !== courseId) {
        setScanResult({
          success: false,
          message: `${student.fullName} is not in your course`,
          student,
        });
        setLoading(false);
        setTimeout(() => setLastScanned(""), 2000);
        return;
      }

      // Mark attendance
      const result = await markAttendance({
        studentId: student.id,
        sessionId: currentSession.id,
        classId: classId,
      });

      if (result.success) {
        setScanResult({
          success: true,
          message: `Attendance marked for ${student.fullName}`,
          student,
        });
        await loadAttendanceCount(currentSession.id);
      } else {
        setScanResult({
          success: false,
          message: result.error || "Failed to mark attendance",
          student,
        });
      }

      // Clear last scanned after a short delay to allow re-scanning same student
      setTimeout(() => setLastScanned(""), 2000);
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || "Failed to mark attendance";
      console.error("Attendance marking error:", err);
      setScanResult({
        success: false,
        message: errorMessage,
      });
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  }, [currentSession, courseId, classId, lastScanned]);

  const totalStudents = students.length;

  return (
    <div className="space-y-6">
      {/* Session Status Card */}
      <Card className="luxury-card border-0">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase flex items-center gap-3">
            <Calendar className="h-6 w-6" />
            Current Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Session Status Display - Auto-detected based on current date/time */}
          {sessionError ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <div className="font-medium">No Active Session</div>
                <div className="text-sm">{sessionError}</div>
              </div>
            </div>
          ) : currentSession && (
            <>
              <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 rounded flex items-center gap-3 mb-4">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <div>
                  <div className="font-medium">Active Session</div>
                  <div className="text-sm">
                    {new Date(currentSession.weekend.saturdayDate).toLocaleDateString()} - {currentSession.day} - {currentSession.startTime} to {currentSession.endTime}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {attendanceCount} / {totalStudents} students marked
                  </span>
                </div>
                <Badge variant={attendanceCount === totalStudents ? "default" : "secondary"}>
                  {totalStudents > 0 ? Math.round((attendanceCount / totalStudents) * 100) : 0}% Complete
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Scanner Card */}
      {currentSession && (
        <Card className="luxury-card border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Mark Class Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MultiScanner
              onScan={handleScan}
              disabled={loading}
              placeholder="Scan barcode, tap NFC, or type admission number..."
            />

            {loading && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-4 mt-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing attendance...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Banner - Matching Security Design */}
      {scanResult && scanResult.student && (
        <Card className={`border-2 transition-all duration-300 ${
          scanResult.success
            ? "border-green-500 bg-green-500"
            : "border-red-500 bg-red-500"
        }`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-3">
              {scanResult.success ? (
                <>
                  <CheckCircle className="h-8 w-8 text-white" />
                  <span className="text-xl font-bold text-white uppercase tracking-wide">Attendance Marked</span>
                </>
              ) : (
                <>
                  <XCircle className="h-8 w-8 text-white" />
                  <span className="text-xl font-bold text-white uppercase tracking-wide">{scanResult.message}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error/Not Found Banner */}
      {scanResult && !scanResult.student && (
        <Card className="border-2 border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <span className="text-xl font-bold text-destructive uppercase tracking-wide">{scanResult.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Details and Attendance Passports - Both Chapel and Class */}
      {studentData && scanResult && scanResult.student && (
        <div className="space-y-6">
          {/* Student Details and Class Attendance Passport */}
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 items-stretch">
            {/* Student Details Card */}
            <Card className="luxury-card border-0 flex flex-col">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase">Student Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 flex-1 flex flex-col">
                {/* Profile Picture */}
                <div className="flex justify-center mb-2">
                  <ProfilePictureDisplay
                    profilePictureUrl={studentData.profilePicture}
                    gender={studentData.gender}
                    size="md"
                  />
                </div>

                {/* Name and Admission Number */}
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="text-center">
                    <div className="text-base font-bold tracking-tight">{studentData.fullName}</div>
                  </div>
                  <div className="h-6 w-[1px] bg-border" />
                  <div className="text-center">
                    <div className="text-sm font-medium">{studentData.admissionNumber}</div>
                  </div>
                </div>

                {/* Gender Badge */}
                <div className="flex justify-center mb-2">
                  <Badge variant={studentData.gender === "MALE" ? "default" : "secondary"} className="text-xs">
                    {studentData.gender}
                  </Badge>
                </div>

                <div className="h-[1px] bg-border/40 w-full my-2" />

                <div className="grid gap-1.5 flex-1">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-sm text-muted-foreground">Course:</span>
                    <span className="text-sm font-medium">{studentData.course.name}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b">
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <span className="text-sm">{studentData.phoneNumber}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b">
                    <span className="text-sm text-muted-foreground">Area:</span>
                    <span className="text-sm">{studentData.areaOfResidence}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Class Attendance Passport - Spans 2 columns on xl */}
            <div className="xl:col-span-2 flex">
              <AttendancePassport
                attendances={studentData.attendances.filter((att: any) => att.session.sessionType === "CLASS")}
                weekends={studentData.weekends}
                type="CLASS"
                studentId={studentData.id}
                className="flex-1"
              />
            </div>
          </div>

          {/* Chapel Attendance Passport - Full width */}
          <AttendancePassport
            attendances={studentData.attendances.filter((att: any) => att.session.sessionType === "CHAPEL")}
            weekends={studentData.weekends}
            type="CHAPEL"
            studentId={studentData.id}
          />
        </div>
      )}
    </div>
  );
}
