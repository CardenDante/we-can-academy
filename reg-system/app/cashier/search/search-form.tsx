"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentByAdmissionWithHistory } from "@/app/actions/students";
import { Search } from "lucide-react";
import { AttendancePassport } from "@/components/attendance-passport";
import { ProfilePictureDisplay } from "@/components/profile-picture";

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
      const data = await getStudentByAdmissionWithHistory(admissionNumber);
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
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 items-stretch">
          {/* Student Details - Spans 1 column */}
          <Card className="luxury-card border-0 flex flex-col">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase">Student Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 flex-1 flex flex-col">
              {/* Profile Picture */}
              <div className="flex justify-center mb-2">
                <ProfilePictureDisplay
                  profilePictureUrl={student.profilePicture}
                  gender={student.gender}
                  size="md"
                />
              </div>

              {/* Name and Admission Number with vertical separator */}
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="text-center">
                  <div className="text-base font-bold tracking-tight">{student.fullName}</div>
                </div>
                <div className="h-6 w-[1px] bg-border" />
                <div className="text-center">
                  <div className="text-sm font-medium">{student.admissionNumber}</div>
                </div>
              </div>

              {/* Gender Badge */}
              <div className="flex justify-center mb-2">
                <Badge variant={student.gender === "MALE" ? "default" : "secondary"} className="text-xs">
                  {student.gender}
                </Badge>
              </div>

              <div className="h-[1px] bg-border/40 w-full my-2" />

              <div className="grid gap-1.5 flex-1">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-sm text-muted-foreground">Course:</span>
                  <span className="text-sm font-medium">{student.course.name}</span>
                </div>

                <div className="flex justify-between py-1 border-b">
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <span className="text-sm">{student.phoneNumber}</span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-sm text-muted-foreground">Area:</span>
                  <span className="text-sm">{student.areaOfResidence}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chapel Passport - Spans 1 column on lg, 2 on xl */}
          <div className="xl:col-span-2 flex">
            <AttendancePassport
              attendances={student.attendances}
              weekends={student.weekends}
              type="CHAPEL"
              studentId={student.id}
              className="flex-1"
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
