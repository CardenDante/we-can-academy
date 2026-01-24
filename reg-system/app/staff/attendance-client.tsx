"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSessions } from "@/app/actions/academy";
import { markAttendance, getAttendanceBySession } from "@/app/actions/attendance";
import { getStudentByAdmission } from "@/app/actions/students";
import { ProfilePictureDisplay } from "@/components/profile-picture";
import { MultiScanner } from "@/components/multi-scanner";
import { CheckCircle, Church, AlertCircle, User, Hash, BookOpen, XCircle } from "lucide-react";

export function AttendanceClient() {
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [notFoundAdmission, setNotFoundAdmission] = useState<string | null>(null);

  // Scanned student display - auto-updates on each scan
  const [scannedStudent, setScannedStudent] = useState<any>(null);
  const [scanStatus, setScanStatus] = useState<"success" | "error" | null>(null);

  const lastSubmitTime = { current: 0 };

  useEffect(() => {
    loadSessionsAndDetectCurrent();
  }, []);

  // Auto-detect current session based on date and time
  function detectCurrentSession(allSessions: any[]) {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter to chapel sessions only
    const chapelSessions = allSessions.filter(s => s.sessionType === "CHAPEL");

    // Find session that matches current day and time
    for (const session of chapelSessions) {
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

  async function loadSessionsAndDetectCurrent() {
    try {
      const data = await getSessions();
      // Sessions loaded but not stored - we only need to detect current session

      // Auto-detect current session
      const detected = detectCurrentSession(data);
      if (detected) {
        setCurrentSession(detected);
        setSessionError("");
      } else {
        setCurrentSession(null);
        setSessionError("No active chapel session at this time. Attendance can only be marked during scheduled session times.");
      }
    } catch (error) {
      console.error(error);
      setSessionError("Failed to load sessions");
    }
  }

  // Handle scan from MultiScanner
  const handleScan = useCallback(async (admNum: string) => {
    const trimmed = admNum.trim();
    if (!trimmed || trimmed.length < 3) return;

    // Debounce - prevent double submissions
    const now = Date.now();
    if (now - lastSubmitTime.current < 1000) return;
    lastSubmitTime.current = now;

    setLoading(true);
    // Clear previous messages when starting a new scan
    setError("");
    setSuccess("");
    setScanStatus(null);
    setNotFoundAdmission(null);

    try {
      if (!currentSession) {
        setError("No active session - cannot mark attendance outside session time");
        setScannedStudent(null);
        setScanStatus("error");
        return;
      }

      // Verify student exists
      const student = await getStudentByAdmission(trimmed);
      if (!student) {
        setNotFoundAdmission(trimmed);
        setScannedStudent(null);
        setScanStatus("error");
        return;
      }

      // Clear not found state since student exists
      setNotFoundAdmission(null);
      // Set scanned student for display (auto-updates each scan)
      setScannedStudent(student);

      const result = await markAttendance({
        studentId: student.id,
        sessionId: currentSession.id,
        classId: undefined,
      });

      // Check result - server action now returns {success, data/error}
      if (!result.success) {
        setError(result.error || "Failed to mark attendance");
        setScanStatus("error");
        return;
      }

      setSuccess(`Attendance marked for ${student.fullName}`);
      setScanStatus("success");
    } catch (err: any) {
      // Catch any unexpected errors
      const errorMessage = err?.message || err?.toString() || "Failed to mark attendance";
      console.error("Attendance marking error:", err);
      setError(errorMessage);
      setScanStatus("error");
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  return (
    <div className="space-y-6">
      {/* Mode Selection Card - Commented out for chapel-only mode
      <Card className="luxury-card border-0">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase">Select Attendance Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant={mode === "CLASS" ? "default" : "outline"}
              onClick={() => {
                setMode("CLASS");
                setSelectedSession("");
                setSelectedClass("");
                setAttendances([]);
              }}
              className="h-24 sm:h-28 transition-all hover:scale-[1.02]"
            >
              <div className="flex flex-col items-center gap-3">
                <Users className="h-8 w-8" />
                <div>
                  <div className="font-medium text-base">CLASS</div>
                  <div className="text-xs text-muted-foreground mt-1">Mark class attendance</div>
                </div>
              </div>
            </Button>
            <Button
              variant={mode === "CHAPEL" ? "default" : "outline"}
              onClick={() => {
                setMode("CHAPEL");
                setSelectedSession("");
                setSelectedClass("");
                setAttendances([]);
              }}
              className="h-24 sm:h-28 transition-all hover:scale-[1.02]"
            >
              <div className="flex flex-col items-center gap-3">
                <Church className="h-8 w-8" />
                <div>
                  <div className="font-medium text-base">CHAPEL</div>
                  <div className="text-xs text-muted-foreground mt-1">Mark chapel attendance</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
      */}

      <Card className="luxury-card border-0">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase flex items-center gap-3">
            <Church className="h-6 w-6" />
            Mark Chapel Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Session Status Display - Auto-detected based on current date/time */}
          {sessionError ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded flex items-center gap-3 mb-6">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <div className="font-medium">No Active Session</div>
                <div className="text-sm">{sessionError}</div>
              </div>
            </div>
          ) : currentSession && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 rounded flex items-center gap-3 mb-6">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <div>
                <div className="font-medium">Active Session</div>
                <div className="text-sm">
                  {currentSession.weekend.name} - {currentSession.day} - {currentSession.name} ({currentSession.startTime} - {currentSession.endTime})
                </div>
              </div>
            </div>
          )}

          <MultiScanner
            onScan={handleScan}
            disabled={loading || !currentSession}
            placeholder="Scan barcode, scan QR code, or type admission number to mark attendance..."
          />
        </CardContent>
      </Card>

      {/* Student Not Found Banner */}
      {notFoundAdmission && !scannedStudent && (
        <Card className="border-2 border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <span className="text-xl font-bold text-destructive uppercase tracking-wide">
                Student Not Found: {notFoundAdmission}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanned Student Display - Auto-updates on each scan, no close needed */}
      {scannedStudent && (
        <Card className={`luxury-card border-2 transition-all duration-300 ${
          scanStatus === "success"
            ? "border-green-500 bg-green-500/5"
            : scanStatus === "error"
            ? "border-destructive bg-destructive/5"
            : "border-border"
        }`}>
          <CardContent className="py-4 sm:py-6">
            {/* Success/Error Messages - Displayed inside the card */}
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-600 text-sm rounded flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Mobile Layout: Compact horizontal with centered course */}
            <div className="flex md:hidden flex-col items-center gap-3">
              {/* Profile Picture */}
              <div className={`rounded-full p-1 ${
                scanStatus === "success" ? "ring-4 ring-green-500/30" : ""
              }`}>
                <ProfilePictureDisplay
                  profilePictureUrl={scannedStudent.profilePicture}
                  gender={scannedStudent.gender}
                  size="sm"
                />
              </div>

              {/* Name and Admission - Horizontal with separator */}
              <div className="flex items-center gap-2 text-center">
                <span className="text-base font-bold tracking-tight">
                  {scannedStudent.fullName}
                </span>
                <div className="h-4 w-[1px] bg-border"></div>
                <span className="text-sm font-mono font-medium">
                  #{scannedStudent.admissionNumber}
                </span>
              </div>

              {/* Course - Plain text, centered */}
              <div className="text-sm text-muted-foreground">
                {scannedStudent.course?.name || "N/A"}
              </div>

              {/* Status Indicator */}
              {scanStatus === "success" && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-xs font-medium text-green-600 uppercase">Marked</span>
                </div>
              )}
              {scanStatus === "error" && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-xs font-medium text-destructive uppercase">Error</span>
                </div>
              )}
            </div>

            {/* Desktop Layout: Horizontal */}
            <div className="hidden md:block">
              <div className="flex items-center gap-6">
                {/* Profile Picture - Large display */}
                <div className="shrink-0">
                  <div className={`rounded-full p-1 ${
                    scanStatus === "success" ? "ring-4 ring-green-500/30" : ""
                  }`}>
                    <ProfilePictureDisplay
                      profilePictureUrl={scannedStudent.profilePicture}
                      gender={scannedStudent.gender}
                      size="lg"
                    />
                  </div>
                </div>

                {/* Student Info */}
                <div className="flex-1 min-w-0">
                  {/* Name - Large */}
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-muted-foreground shrink-0" />
                    <h2 className="text-2xl font-bold tracking-tight truncate">
                      {scannedStudent.fullName}
                    </h2>
                  </div>

                  {/* Admission Number */}
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-lg font-mono font-medium">
                      {scannedStudent.admissionNumber}
                    </span>
                  </div>

                  {/* Course/Class */}
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Badge variant="secondary" className="text-sm">
                      {scannedStudent.course?.name || "N/A"}
                    </Badge>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="shrink-0">
                  {scanStatus === "success" && (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle className="h-12 w-12 text-green-500" />
                      <span className="text-xs font-medium text-green-600 uppercase">Marked</span>
                    </div>
                  )}
                  {scanStatus === "error" && (
                    <div className="flex flex-col items-center gap-1">
                      <AlertCircle className="h-12 w-12 text-destructive" />
                      <span className="text-xs font-medium text-destructive uppercase">Error</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
