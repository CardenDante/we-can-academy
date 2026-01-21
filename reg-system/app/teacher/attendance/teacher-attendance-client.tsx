"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { markAttendance, getAttendanceBySession } from "@/app/actions/attendance";
import { getStudentByAdmission } from "@/app/actions/students";
import { ProfilePictureDisplay } from "@/components/profile-picture";
import {
  CheckCircle,
  AlertCircle,
  ScanLine,
  User,
  Calendar,
  BookOpen,
  Loader2,
} from "lucide-react";

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
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scannedStudent, setScannedStudent] = useState<any>(null);
  const [scanStatus, setScanStatus] = useState<"success" | "error" | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-select current session if available
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const session of sessions) {
      const sessionDate = new Date(session.weekend.saturdayDate);
      if (session.day === "SUNDAY") {
        sessionDate.setDate(sessionDate.getDate() + 1);
      }
      sessionDate.setHours(0, 0, 0, 0);

      if (sessionDate.getTime() === today.getTime()) {
        const [startHour, startMin] = session.startTime.split(":").map(Number);
        const [endHour, endMin] = session.endTime.split(":").map(Number);

        const sessionStart = new Date(today);
        sessionStart.setHours(startHour, startMin, 0, 0);

        const sessionEnd = new Date(today);
        sessionEnd.setHours(endHour, endMin, 0, 0);

        if (sessionEnd <= sessionStart) {
          sessionEnd.setDate(sessionEnd.getDate() + 1);
        }

        if (now >= sessionStart && now <= sessionEnd) {
          setCurrentSession(session);
          break;
        }
      }
    }
  }, [sessions]);

  useEffect(() => {
    if (currentSession) {
      loadAttendances();
    }
  }, [currentSession]);

  async function loadAttendances() {
    if (!currentSession) return;

    try {
      const data = await getAttendanceBySession(currentSession.id, classId);
      setAttendances(data);
    } catch (error) {
      console.error("Error loading attendances:", error);
    }
  }

  async function handleMarkAttendance(e: React.FormEvent) {
    e.preventDefault();

    if (!currentSession) {
      setError("Please select a session first");
      return;
    }

    if (!admissionNumber.trim()) {
      setError("Please enter an admission number");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setScanStatus(null);
    setScannedStudent(null);

    try {
      // Get student info first
      const student = await getStudentByAdmission(admissionNumber.trim());

      if (!student) {
        setError("Student not found");
        setScanStatus("error");
        setLoading(false);
        setAdmissionNumber("");
        inputRef.current?.focus();
        return;
      }

      setScannedStudent(student);

      // Verify student is in this course
      if (student.courseId !== courseId) {
        setError(`${student.fullName} is not in your course`);
        setScanStatus("error");
        setLoading(false);
        setAdmissionNumber("");
        inputRef.current?.focus();
        return;
      }

      // Mark attendance
      const result = await markAttendance({
        studentId: student.id,
        sessionId: currentSession.id,
        classId: classId,
      });

      if (result.success) {
        setSuccess(`✓ ${student.fullName} marked present`);
        setScanStatus("success");
        await loadAttendances();
      } else {
        setError(result.error || "Failed to mark attendance");
        setScanStatus("error");
      }
    } catch (error: any) {
      setError(error.message || "Failed to mark attendance");
      setScanStatus("error");
    }

    setLoading(false);
    setAdmissionNumber("");
    inputRef.current?.focus();
  }

  function handleSessionChange(sessionId: string) {
    const session = sessions.find((s) => s.id === sessionId);
    setCurrentSession(session);
    setAdmissionNumber("");
    setError("");
    setSuccess("");
    setScannedStudent(null);
    setScanStatus(null);
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Session Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="session">Class Session</Label>
            <Select
              value={currentSession?.id || ""}
              onValueChange={handleSessionChange}
            >
              <SelectTrigger id="session">
                <SelectValue placeholder="Select a session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No sessions available
                  </div>
                ) : (
                  sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.weekend.name} - {session.day} - {session.name} (
                      {session.startTime} - {session.endTime})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {currentSession && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>
                  <strong>Weekend:</strong> {currentSession.weekend.name}
                </p>
                <p>
                  <strong>Day:</strong> {currentSession.day}
                </p>
                <p>
                  <strong>Time:</strong> {currentSession.startTime} -{" "}
                  {currentSession.endTime}
                </p>
                <p>
                  <strong>Marked:</strong> {attendances.length} student
                  {attendances.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Marking Form */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Mark Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMarkAttendance} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admission">Admission Number</Label>
                <Input
                  ref={inputRef}
                  id="admission"
                  type="text"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="Scan or enter admission number"
                  autoFocus
                  disabled={loading}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Present
                  </>
                )}
              </Button>
            </form>

            {/* Status Messages */}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{success}</p>
              </div>
            )}

            {/* Scanned Student Display */}
            {scannedStudent && (
              <div
                className={`mt-4 p-4 rounded-lg border-2 ${
                  scanStatus === "success"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-destructive bg-destructive/10"
                }`}
              >
                <div className="flex items-center gap-4">
                  <ProfilePictureDisplay
                    profilePictureUrl={scannedStudent.profilePicture}
                    gender={scannedStudent.gender}
                    size="md"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{scannedStudent.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {scannedStudent.admissionNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {scannedStudent.course.name}
                    </p>
                  </div>
                  {scanStatus === "success" && (
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  )}
                  {scanStatus === "error" && (
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendance List */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Attendance List
              </span>
              <Badge variant="secondary">
                {attendances.length} / {students.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="mx-auto h-12 w-12 opacity-50 mb-3" />
                <p>No students marked yet</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Marked By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendances.map((attendance) => (
                      <TableRow key={attendance.id}>
                        <TableCell className="flex items-center gap-3">
                          <ProfilePictureDisplay
                            profilePictureUrl={attendance.student.profilePicture}
                            gender={attendance.student.gender}
                            size="sm"
                          />
                          <span className="font-medium">
                            {attendance.student.fullName}
                          </span>
                        </TableCell>
                        <TableCell>
                          {attendance.student.admissionNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(attendance.markedAt).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </TableCell>
                        <TableCell>{attendance.markedBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
