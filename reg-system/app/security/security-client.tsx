"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentByAdmission } from "@/app/actions/students";
import { ScanLine } from "lucide-react";

export function SecurityClient() {
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleScan(value: string) {
    if (!value) return;
    
    setLoading(true);
    setError("");
    setStudent(null);

    try {
      const data = await getStudentByAdmission(value);
      if (!data) {
        setError("Student not found");
      } else {
        setStudent(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to find student");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleScan(admissionNumber);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="scan">Scan Barcode / NFC</Label>
            <div className="relative">
              <ScanLine className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="scan"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                onBlur={() => handleScan(admissionNumber)}
                placeholder="Scan admission number..."
                className="pl-10 h-14 text-lg"
                autoFocus
              />
            </div>
            {loading && (
              <div className="text-sm text-muted-foreground text-center">
                Searching...
              </div>
            )}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {student && (
        <div className="space-y-6">
          <Card className="border-green-500 border-2">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-700">✓ Student Found</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Full Name</div>
                    <div className="text-lg font-bold">{student.fullName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Admission Number</div>
                    <div className="text-lg font-medium">{student.admissionNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Gender</div>
                    <div>
                      <Badge variant={student.gender === "MALE" ? "default" : "secondary"}>
                        {student.gender}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Course</div>
                    <div className="font-medium">{student.course.name}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Phone Number</div>
                    <div className="font-medium">{student.phoneNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Identification</div>
                    <div className="font-medium">{student.identification}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Area of Residence</div>
                    <div className="font-medium">{student.areaOfResidence}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Registered</div>
                    <div className="font-medium">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              {student.attendances.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No attendance records yet
                </div>
              ) : (
                <div className="space-y-2">
                  {student.attendances.slice(0, 10).map((att: any) => (
                    <div
                      key={att.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">{att.session.weekend.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {att.session.name} - {att.session.day}
                          </div>
                        </div>
                        <Badge>{att.session.sessionType}</Badge>
                      </div>
                      {att.class && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Class:</span>{" "}
                          <span className="font-medium">{att.class.name}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        Marked: {new Date(att.markedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {student.attendances.length > 10 && (
                    <div className="text-center text-sm text-muted-foreground pt-2">
                      Showing 10 of {student.attendances.length} records
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
