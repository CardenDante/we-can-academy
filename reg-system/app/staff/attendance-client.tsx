"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSessions, getClasses } from "@/app/actions/academy";
import { markAttendance, getAttendanceBySession } from "@/app/actions/attendance";
import { getStudentByAdmission } from "@/app/actions/students";
import { CheckCircle, Users, Church } from "lucide-react";

export function AttendanceClient() {
  const [mode, setMode] = useState<"CLASS" | "CHAPEL">("CLASS");
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadSessions();
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadAttendances();
    }
  }, [selectedSession, selectedClass]);

  async function loadSessions() {
    try {
      const data = await getSessions();
      // Filter recent sessions
      const recent = data.slice(0, 20);
      setSessions(recent);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadClasses() {
    try {
      const data = await getClasses();
      setClasses(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadAttendances() {
    try {
      const classId = mode === "CLASS" ? selectedClass : undefined;
      const data = await getAttendanceBySession(selectedSession, classId);
      setAttendances(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleMarkAttendance(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!selectedSession) {
        setError("Please select a session");
        return;
      }

      if (mode === "CLASS" && !selectedClass) {
        setError("Please select a class");
        return;
      }

      // Verify student exists
      const student = await getStudentByAdmission(admissionNumber);
      if (!student) {
        setError("Student not found");
        return;
      }

      await markAttendance({
        studentId: student.id,
        sessionId: selectedSession,
        classId: mode === "CLASS" ? selectedClass : undefined,
      });

      setSuccess(`Attendance marked for ${student.fullName}`);
      setAdmissionNumber("");
      loadAttendances();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to mark attendance");
    } finally {
      setLoading(false);
    }
  }

  const filteredSessions = sessions.filter(s => s.sessionType === mode);

  return (
    <div className="space-y-6">
      <Card className="luxury-card border-0">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">Select Attendance Mode</CardTitle>
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

      <Card className="luxury-card border-0">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">
            Mark Attendance - {mode}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMarkAttendance} className="space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="admissionNumber" className="text-sm font-medium">
                Scan Admission Number *
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="admissionNumber"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="Scan or enter admission number"
                  required
                  autoFocus
                  className="h-11 flex-1"
                />
                <Button type="submit" disabled={loading} className="h-11 sm:min-w-[140px]">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {loading ? "Marking..." : "Mark"}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 text-sm rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {success}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {selectedSession && (
        <Card className="luxury-card border-0">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">
              Recent Attendance
              <span className="ml-2 text-sm text-muted-foreground font-normal">
                ({attendances.length} student{attendances.length !== 1 ? "s" : ""})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {attendances.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No attendance marked yet
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4 sm:pl-4">Admission #</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Course</TableHead>
                      {mode === "CLASS" && <TableHead className="hidden md:table-cell">Class</TableHead>}
                      <TableHead className="hidden lg:table-cell">Marked At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendances.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell className="font-medium pl-4 sm:pl-4">
                          {att.student.admissionNumber}
                        </TableCell>
                        <TableCell>{att.student.fullName}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {att.student.course.name}
                          </Badge>
                        </TableCell>
                        {mode === "CLASS" && (
                          <TableCell className="hidden md:table-cell">
                            {att.class ? att.class.name : "-"}
                          </TableCell>
                        )}
                        <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                          {new Date(att.markedAt).toLocaleTimeString()}
                        </TableCell>
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
