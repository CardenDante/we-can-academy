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
      <Card>
        <CardHeader>
          <CardTitle>Select Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={mode === "CLASS" ? "default" : "outline"}
              onClick={() => {
                setMode("CLASS");
                setSelectedSession("");
                setSelectedClass("");
                setAttendances([]);
              }}
              className="h-20"
            >
              <div className="flex flex-col items-center gap-2">
                <Users className="h-6 w-6" />
                <span>CLASS</span>
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
              className="h-20"
            >
              <div className="flex flex-col items-center gap-2">
                <Church className="h-6 w-6" />
                <span>CHAPEL</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance - {mode}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMarkAttendance} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="session">Select Session *</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <Label htmlFor="class">Select Class *</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
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
              <Label htmlFor="admissionNumber">Scan Admission Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="admissionNumber"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="Scan or enter admission number"
                  required
                  autoFocus
                />
                <Button type="submit" disabled={loading}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {loading ? "Marking..." : "Mark"}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-500/10 text-green-600 text-sm rounded-md">
                {success}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {selectedSession && (
        <Card>
          <CardHeader>
            <CardTitle>
              Recent Attendance ({attendances.length} students)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendances.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No attendance marked yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Course</TableHead>
                    {mode === "CLASS" && <TableHead>Class</TableHead>}
                    <TableHead>Marked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((att) => (
                    <TableRow key={att.id}>
                      <TableCell className="font-medium">
                        {att.student.admissionNumber}
                      </TableCell>
                      <TableCell>{att.student.fullName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{att.student.course.name}</Badge>
                      </TableCell>
                      {mode === "CLASS" && (
                        <TableCell>
                          {att.class ? att.class.name : "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground">
                        {new Date(att.markedAt).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
