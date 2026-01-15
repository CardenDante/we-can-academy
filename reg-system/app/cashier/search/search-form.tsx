"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentByAdmission } from "@/app/actions/students";
import { Search } from "lucide-react";

export function SearchStudentForm() {
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStudent(null);

    try {
      const data = await getStudentByAdmission(admissionNumber);
      if (!data) {
        setError("Student not found");
      } else {
        setStudent(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to search student");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="luxury-card border-0 max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admissionNumber">Admission Number / Receipt Number</Label>
              <div className="flex gap-2">
                <Input
                  id="admissionNumber"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="Enter admission number"
                  required
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {student && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="luxury-card border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-light tracking-tight">Student Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Admission Number:</span>
                  <span className="text-sm font-medium">{student.admissionNumber}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Full Name:</span>
                  <span className="text-sm font-medium">{student.fullName}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Gender:</span>
                  <Badge variant={student.gender === "MALE" ? "default" : "secondary"} className="text-xs">
                    {student.gender}
                  </Badge>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Course:</span>
                  <span className="text-sm font-medium">{student.course.name}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <span className="text-sm">{student.phoneNumber}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Identification:</span>
                  <span className="text-sm">{student.identification}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Area:</span>
                  <span className="text-sm">{student.areaOfResidence}</span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-sm text-muted-foreground">Registered:</span>
                  <span className="text-sm">{new Date(student.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="luxury-card border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-light tracking-tight">Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              {student.attendances.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  No attendance records yet
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {student.attendances.slice(0, 10).map((att: any) => (
                    <div key={att.id} className="border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="text-sm font-medium">{att.session.weekend.name}</div>
                        <Badge className="text-xs">{att.session.sessionType}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {att.session.name} ({att.session.day})
                      </div>
                      {att.class && (
                        <div className="text-xs">Class: {att.class.name}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(att.markedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
