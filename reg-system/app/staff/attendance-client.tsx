"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSessions } from "@/app/actions/academy";
import { markAttendance, getAttendanceBySession } from "@/app/actions/attendance";
import { getStudentByAdmission } from "@/app/actions/students";
import { ProfilePictureDisplay } from "@/components/profile-picture";
import { CheckCircle, Church, AlertCircle, ScanLine, User, Hash, BookOpen } from "lucide-react";

export function AttendanceClient() {
  // Chapel only - class features commented out for future use
  // const [mode, setMode] = useState<"CLASS" | "CHAPEL">("CLASS");
  // const [sessions, setSessions] = useState<any[]>([]); // Commented out - only currentSession is needed
  // const [classes, setClasses] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  // const [selectedClass, setSelectedClass] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sessionError, setSessionError] = useState("");

  // Scanned student display - auto-updates on each scan
  const [scannedStudent, setScannedStudent] = useState<any>(null);
  const [scanStatus, setScanStatus] = useState<"success" | "error" | null>(null);

  // Barcode scanner detection
  const inputRef = useRef<HTMLInputElement>(null);
  const keyTimestamps = useRef<number[]>([]);
  const lastSubmitTime = useRef(0);

  useEffect(() => {
    loadSessionsAndDetectCurrent();
    // loadClasses(); // Commented out - class features disabled
  }, []);

  useEffect(() => {
    if (currentSession) {
      loadAttendances();
    }
  }, [currentSession]);

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

  /* Commented out - class features disabled
  async function loadClasses() {
    try {
      const data = await getClasses();
      setClasses(data);
    } catch (error) {
      console.error(error);
    }
  }
  */

  async function loadAttendances() {
    try {
      if (!currentSession) return;
      // const classId = mode === "CLASS" ? selectedClass : undefined; // Commented out
      const data = await getAttendanceBySession(currentSession.id, undefined);
      setAttendances(data);
    } catch (error) {
      console.error(error);
    }
  }

  // Process attendance marking
  const processAttendance = useCallback(async (admNum: string) => {
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
        setError(`Student not found: ${trimmed}`);
        setScannedStudent(null);
        setScanStatus("error");
        return;
      }

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
        setAdmissionNumber("");
        // Re-focus input for next scan
        setTimeout(() => inputRef.current?.focus(), 100);
        // Messages persist until next entry
        return;
      }

      setSuccess(`Attendance marked for ${student.fullName}`);
      setScanStatus("success");
      setAdmissionNumber("");
      loadAttendances();

      // Re-focus input for next scan
      setTimeout(() => inputRef.current?.focus(), 100);
      // Messages persist until next entry
    } catch (err: any) {
      // Catch any unexpected errors
      const errorMessage = err?.message || err?.toString() || "Failed to mark attendance";
      console.error("Attendance marking error:", err);
      setError(errorMessage);
      setScanStatus("error");
      setAdmissionNumber("");
      // Re-focus input for next scan
      setTimeout(() => inputRef.current?.focus(), 100);
      // Messages persist until next entry
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  async function handleMarkAttendance(e: React.FormEvent) {
    e.preventDefault();
    keyTimestamps.current = [];
    await processAttendance(admissionNumber);
  }

  // Handle keyboard input with barcode scanner detection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();

    if (e.key === "Enter") {
      e.preventDefault();
      keyTimestamps.current = [];
      processAttendance(admissionNumber);
      return;
    }

    // Track keystroke timing for barcode detection
    keyTimestamps.current.push(now);
    keyTimestamps.current = keyTimestamps.current.filter(t => now - t < 500);
  };

  // Auto-submit for fast barcode scanner input
  useEffect(() => {
    if (admissionNumber.length < 3 || loading) return;

    const timestamps = keyTimestamps.current;
    if (timestamps.length < 2) return;

    // Calculate average time between keystrokes
    let totalGap = 0;
    for (let i = 1; i < timestamps.length; i++) {
      totalGap += timestamps[i] - timestamps[i - 1];
    }
    const avgGap = totalGap / (timestamps.length - 1);

    // If typing is very fast (barcode scanner), auto-submit after brief pause
    if (avgGap < 50) {
      const timeoutId = setTimeout(() => {
        keyTimestamps.current = [];
        processAttendance(admissionNumber);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [admissionNumber, loading, processAttendance]);

  // const filteredSessions = sessions.filter(s => s.sessionType === mode); // Commented out

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

          <form onSubmit={handleMarkAttendance} className="space-y-6">
            {/* Session Selection - Commented out, now auto-detected
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="session" className="text-sm font-medium">Select Session *</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.weekend.name} - {session.day} - {session.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === "CLASS" && (
                <div className="space-y-2">
                  <Label htmlFor="class" className="text-sm font-medium">Select Class *</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.course.name} - Class {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            */}

            <div className="space-y-2">
              <Label htmlFor="admissionNumber" className="text-sm font-medium">
                Scan Admission Number *
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    id="admissionNumber"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scan barcode or enter admission number"
                    required
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="h-12 pl-10 text-lg font-mono tracking-wider"
                    disabled={loading || !currentSession}
                  />
                </div>
                <Button type="submit" disabled={loading || !currentSession} className="h-12 sm:min-w-[140px]">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {loading ? "Marking..." : "Mark"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Barcode scanners will auto-submit. Manual entry requires pressing Enter or clicking Mark.
              </p>
            </div>

          </form>
        </CardContent>
      </Card>

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
