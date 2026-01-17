"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentByAdmission } from "@/app/actions/students";
import { Loader2 } from "lucide-react";
import { AttendancePassport } from "@/components/attendance-passport";
import { ProfilePictureDisplay } from "@/components/profile-picture";
import { MultiScanner } from "@/components/multi-scanner";

export function SecurityClient() {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastScanned, setLastScanned] = useState("");

  const handleScan = useCallback(async (value: string) => {
    if (!value || value === lastScanned) return;

    setLoading(true);
    setError("");
    setLastScanned(value);

    try {
      const data = await getStudentByAdmission(value);
      if (!data) {
        setError(`Student not found: ${value}`);
        setStudent(null);
      } else {
        setStudent(data);
        setError("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to find student");
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, [lastScanned]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="luxury-card border-0">
        <CardContent className="pt-6 sm:pt-8">
          <MultiScanner
            onScan={handleScan}
            disabled={loading}
            placeholder="Scan barcode, tap NFC, or type admission number..."
          />

          {loading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-4 mt-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Searching...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg text-center flex items-center justify-center gap-2 mt-4">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {student && (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 auto-rows-max">
          {/* Student Details - Spans 1 column */}
          <Card className="luxury-card border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-light tracking-tight">Student Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Picture */}
              <div className="flex justify-center mb-4">
                <ProfilePictureDisplay
                  admissionNumber={student.admissionNumber}
                  gender={student.gender}
                  size="lg"
                />
              </div>

              <div className="text-center mb-4">
                <div className="text-lg font-bold tracking-tight">{student.fullName}</div>
                <div className="text-sm text-muted-foreground">{student.admissionNumber}</div>
              </div>

              <div className="h-[1px] bg-border/40 w-full" />

              <div className="grid gap-3">
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

          {/* Chapel Passport - Spans 1 column on lg, 2 on xl */}
          <div className="xl:col-span-2">
            <AttendancePassport
              attendances={student.attendances}
              weekends={student.weekends}
              type="CHAPEL"
              studentId={student.id}
            />
          </div>

          {/* CLASS PASSPORT - COMMENTED OUT FOR CHAPEL-ONLY MODE */}
          {/* <div className="lg:col-span-2 xl:col-span-3">
            <AttendancePassport
              attendances={student.attendances}
              weekends={student.weekends}
              type="CLASS"
              studentId={student.id}
            />
          </div> */}
        </div>
      )}
    </div>
  );
}
