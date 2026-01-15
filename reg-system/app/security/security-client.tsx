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
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="luxury-card border-0">
        <CardContent className="pt-6 sm:pt-8">
          <div className="space-y-3">
            <Label htmlFor="scan" className="text-sm font-medium">
              Scan Barcode / NFC
            </Label>
            <div className="relative">
              <ScanLine className="absolute left-4 top-4 h-6 w-6 text-muted-foreground" />
              <Input
                id="scan"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                onBlur={() => handleScan(admissionNumber)}
                placeholder="Scan admission number..."
                className="pl-14 h-16 text-lg"
                autoFocus
              />
            </div>
            {loading && (
              <div className="text-sm text-muted-foreground text-center py-2">
                Searching...
              </div>
            )}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg text-center flex items-center justify-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {student && (
        <div className="space-y-6">
          <Card className="luxury-card border-green-500 dark:border-green-600 border-2">
            <CardHeader className="bg-green-50 dark:bg-green-950/20 pb-4 sm:pb-6">
              <CardTitle className="text-xl sm:text-2xl font-light tracking-tight text-green-700 dark:text-green-400">
                ✓ Student Found
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 sm:pt-8">
              <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
                <div className="space-y-4 sm:space-y-5">
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Full Name</div>
                    <div className="text-lg sm:text-xl font-bold tracking-tight">{student.fullName}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Admission Number</div>
                    <div className="text-base sm:text-lg font-medium">{student.admissionNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Gender</div>
                    <div>
                      <Badge variant={student.gender === "MALE" ? "default" : "secondary"} className="text-xs">
                        {student.gender}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Course</div>
                    <div className="font-medium text-sm sm:text-base">{student.course.name}</div>
                  </div>
                </div>
                <div className="space-y-4 sm:space-y-5">
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Phone Number</div>
                    <div className="font-medium text-sm sm:text-base">{student.phoneNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Identification</div>
                    <div className="font-medium text-sm sm:text-base">{student.identification}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Area of Residence</div>
                    <div className="font-medium text-sm sm:text-base">{student.areaOfResidence}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Registered</div>
                    <div className="font-medium text-sm sm:text-base">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="luxury-card border-0">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">
                Attendance History
                <span className="ml-2 text-sm text-muted-foreground font-normal">
                  ({student.attendances.length} record{student.attendances.length !== 1 ? "s" : ""})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {student.attendances.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  No attendance records yet
                </div>
              ) : (
                <div className="space-y-3">
                  {student.attendances.slice(0, 10).map((att: any) => (
                    <div
                      key={att.id}
                      className="border border-border/50 rounded-lg p-4 sm:p-5 hover:bg-accent/30 hover:border-primary/20 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-base sm:text-lg tracking-tight">
                            {att.session.weekend.name}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {att.session.name} - {att.session.day}
                          </div>
                        </div>
                        <Badge variant={att.session.sessionType === "CLASS" ? "default" : "secondary"} className="text-xs self-start">
                          {att.session.sessionType}
                        </Badge>
                      </div>
                      {att.class && (
                        <div className="text-sm mb-2">
                          <span className="text-muted-foreground">Class:</span>{" "}
                          <span className="font-medium">{att.class.name}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Marked: {new Date(att.markedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {student.attendances.length > 10 && (
                    <div className="text-center text-sm text-muted-foreground pt-3 border-t">
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
