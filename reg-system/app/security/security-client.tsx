"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkInStudent } from "@/app/actions/checkin";
import { getStudentByAdmissionWithHistory } from "@/app/actions/students";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCheck,
  Clock,
  ShieldAlert
} from "lucide-react";
import { ProfilePictureDisplay } from "@/components/profile-picture";
import { MultiScanner } from "@/components/multi-scanner";
import { AttendancePassport } from "@/components/attendance-passport";

type CheckInStatus = "checked_in" | "already_checked_in" | "expelled" | "not_found" | "no_weekend" | "not_weekend";

export function SecurityClient() {
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    status: CheckInStatus;
    message: string;
    reason?: string | null;
    student?: any;
    checkIn?: any;
  } | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState("");

  // Vibration feedback helper
  const vibrate = (pattern: number | number[]) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const handleScan = useCallback(async (value: string) => {
    if (!value || value === lastScanned) return;

    setLoading(true);
    setLastScanned(value);

    try {
      const result = await checkInStudent(value);
      setScanResult(result);

      // Fetch student's full data with attendance history if student exists
      if (result.student?.admissionNumber) {
        const fullStudentData = await getStudentByAdmissionWithHistory(result.student.admissionNumber);
        setStudentData(fullStudentData);
      } else {
        setStudentData(null);
      }

      // Vibration feedback based on result
      if (result.status === "checked_in" || result.status === "already_checked_in") {
        vibrate(200); // Single vibration for success
      } else {
        vibrate([200, 100, 200]); // Double vibration for error
      }

      // Clear last scanned after a short delay to allow re-scanning same student
      setTimeout(() => setLastScanned(""), 2000);
    } catch (err: any) {
      setScanResult({
        success: false,
        status: "not_found",
        message: err.message || "Failed to process check-in",
      });
      setStudentData(null);
      vibrate([200, 100, 200]); // Double vibration for error
    } finally {
      setLoading(false);
    }
  }, [lastScanned]);

  return (
    <div className="space-y-6">
      {/* Status Banner - Top of Results */}
      {scanResult && scanResult.student && (
        <Card className={`border-2 transition-all duration-300 ${
          scanResult.status === "expelled"
            ? "border-red-600 bg-red-600"
            : scanResult.status === "checked_in"
            ? "border-green-500 bg-green-500"
            : scanResult.status === "already_checked_in"
            ? "border-blue-500 bg-blue-500"
            : scanResult.status === "not_weekend"
            ? "border-amber-500 bg-amber-500"
            : "border-amber-500 bg-amber-500/5"
        }`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-3">
              {scanResult.status === "expelled" && (
                <>
                  <ShieldAlert className="h-8 w-8 text-white" />
                  <span className="text-xl font-bold text-white uppercase tracking-wide">EXPELLED - DO NOT ALLOW ENTRY</span>
                </>
              )}
              {scanResult.status === "checked_in" && (
                <>
                  <CheckCircle className="h-8 w-8 text-white" />
                  <span className="text-xl font-bold text-white uppercase tracking-wide">Checked In</span>
                  {scanResult.student?.hasWarning && (
                    <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-amber-600 rounded">
                      <AlertTriangle className="h-5 w-5 text-white" />
                      <span className="text-sm font-bold text-white uppercase">Warning</span>
                    </div>
                  )}
                </>
              )}
              {scanResult.status === "already_checked_in" && (
                <>
                  <Clock className="h-8 w-8 text-white" />
                  <span className="text-xl font-bold text-white uppercase tracking-wide">Already In</span>
                  {scanResult.student?.hasWarning && (
                    <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-amber-600 rounded">
                      <AlertTriangle className="h-5 w-5 text-white" />
                      <span className="text-sm font-bold text-white uppercase">Warning</span>
                    </div>
                  )}
                </>
              )}
              {scanResult.status === "not_weekend" && (
                <>
                  <Clock className="h-8 w-8 text-white" />
                  <span className="text-xl font-bold text-white uppercase tracking-wide">Check-In Only on Weekends</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error/Not Found Banner */}
      {scanResult && !scanResult.student && (
        <Card className="border-2 border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-3">
              {scanResult.status === "no_weekend" ? (
                <>
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                  <span className="text-xl font-bold text-amber-600 uppercase tracking-wide">No Active Session</span>
                </>
              ) : scanResult.status === "not_weekend" ? (
                <>
                  <Clock className="h-8 w-8 text-amber-600" />
                  <span className="text-xl font-bold text-amber-600 uppercase tracking-wide">Check-In Only on Weekends</span>
                </>
              ) : (
                <>
                  <XCircle className="h-8 w-8 text-destructive" />
                  <span className="text-xl font-bold text-destructive uppercase tracking-wide">Student Not Found</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanner Card */}
      <Card className="luxury-card border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Gate Check-In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MultiScanner
            onScan={handleScan}
            disabled={loading}
            placeholder="Scan barcode, tap NFC, or type admission number to check in..."
          />

          {loading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-4 mt-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing check-in...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Details and Attendance - Matching Cashier Layout */}
      {studentData && scanResult && scanResult.student && (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 items-stretch">
          {/* Student Details Card */}
          <Card className="luxury-card border-0 flex flex-col">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase">Student Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 flex-1 flex flex-col">
              {/* Profile Picture */}
              <div className="flex justify-center mb-2">
                <ProfilePictureDisplay
                  profilePictureUrl={studentData.profilePicture}
                  gender={studentData.gender}
                  size="md"
                />
              </div>

              {/* Name and Admission Number */}
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="text-center">
                  <div className="text-base font-bold tracking-tight">{studentData.fullName}</div>
                </div>
                <div className="h-6 w-[1px] bg-border" />
                <div className="text-center">
                  <div className="text-sm font-medium">{studentData.admissionNumber}</div>
                </div>
              </div>

              {/* Gender Badge */}
              <div className="flex justify-center mb-2">
                <Badge variant={studentData.gender === "MALE" ? "default" : "secondary"} className="text-xs">
                  {studentData.gender}
                </Badge>
              </div>

              <div className="h-[1px] bg-border/40 w-full my-2" />

              <div className="grid gap-1.5 flex-1">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-sm text-muted-foreground">Course:</span>
                  <span className="text-sm font-medium">{studentData.course.name}</span>
                </div>

                <div className="flex justify-between py-1 border-b">
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <span className="text-sm">{studentData.phoneNumber}</span>
                </div>

                <div className="flex justify-between py-1 border-b">
                  <span className="text-sm text-muted-foreground">Area:</span>
                  <span className="text-sm">{studentData.areaOfResidence}</span>
                </div>

                {/* Expelled Reason if applicable */}
                {scanResult.status === "expelled" && scanResult.reason && (
                  <>
                    <div className="h-[1px] bg-border/40 w-full my-2" />
                    <div className="p-2 bg-red-600 rounded text-sm text-white">
                      <strong>Expelled Reason:</strong>
                      <div className="mt-1">{scanResult.reason}</div>
                    </div>
                  </>
                )}

                {/* Warning Reason if applicable */}
                {scanResult.student?.hasWarning && scanResult.student?.warningReason && (
                  <>
                    <div className="h-[1px] bg-border/40 w-full my-2" />
                    <div className="p-2 bg-amber-600 rounded text-sm text-white">
                      <strong>Warning Reason:</strong>
                      <div className="mt-1">{scanResult.student.warningReason}</div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chapel Passport - Spans 2 columns on xl */}
          <div className="xl:col-span-2 flex">
            <AttendancePassport
              attendances={studentData.attendances.filter((att: any) => att.session.sessionType === "CHAPEL")}
              weekends={studentData.weekends}
              type="CHAPEL"
              studentId={studentData.id}
              className="flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
