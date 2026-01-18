"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProfilePictureDisplay } from "@/components/profile-picture";
import { AttendancePassport } from "@/components/attendance-passport";
import { deleteStudent } from "@/app/actions/students";
import {
  User,
  Hash,
  Phone,
  MapPin,
  CreditCard,
  BookOpen,
  ShieldAlert,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { useRouter } from "next/navigation";

type StudentData = {
  id: string;
  admissionNumber: string;
  fullName: string;
  gender: "MALE" | "FEMALE";
  course: {
    id: string;
    name: string;
  };
  areaOfResidence: string;
  phoneNumber: string;
  identification: string;
  profilePicture: string | null;
  isExpelled: boolean;
  expelledAt: Date | null;
  expelledReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  attendances: any[];
  weekends: any[];
  checkIns?: any[];
};

export function StudentDetailClient({ student }: { student: StudentData }) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const chapelAttendances = student.attendances.filter((att) => att.session.sessionType === "CHAPEL");
  const classAttendances = student.attendances.filter((att) => att.session.sessionType === "CLASS");
  const checkIns = student.checkIns || [];

  // Calculate attendance rate
  const totalWeekends = student.weekends.length;
  const attendanceRate = totalWeekends > 0 ? Math.round((chapelAttendances.length / totalWeekends) * 100) : 0;
  const checkInRate = totalWeekends > 0 ? Math.round((checkIns.length / totalWeekends) * 100) : 0;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteStudent(student.id);
      router.push("/admin/students");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete student");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="luxury-card border-0 lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium tracking-tight uppercase">
                Student Profile
              </CardTitle>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture */}
            <div className="flex justify-center">
              <div className={student.isExpelled ? "ring-4 ring-red-500/50 rounded-full" : ""}>
                <ProfilePictureDisplay
                  profilePictureUrl={student.profilePicture}
                  gender={student.gender}
                  size="lg"
                />
              </div>
            </div>

            {/* Status Badge */}
            {student.isExpelled && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 font-medium mb-2">
                  <ShieldAlert className="h-4 w-4" />
                  EXPELLED
                </div>
                <p className="text-sm text-red-600">
                  {student.expelledReason}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expelled on {new Date(student.expelledAt!).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Student Info */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium">{student.fullName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Admission Number</p>
                  <p className="font-mono font-medium">{student.admissionNumber}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Course</p>
                  <Badge variant="outline">{student.course.name}</Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  <p className="font-medium">{student.phoneNumber}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Area of Residence</p>
                  <p className="font-medium">{student.areaOfResidence}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">ID/Passport</p>
                  <p className="font-medium">{student.identification}</p>
                </div>
              </div>
            </div>

            {/* Registration Date */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">Registered on</p>
              <p className="text-sm font-medium">
                {new Date(student.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Analytics and Attendance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="luxury-card border-0">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Check-ins</p>
                  </div>
                  <p className="text-2xl font-bold">{checkIns.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {checkInRate}% of weekends
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="luxury-card border-0">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-xs text-muted-foreground">Chapel</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{chapelAttendances.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {attendanceRate}% attendance
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="luxury-card border-0">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <p className="text-xs text-muted-foreground">Classes</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{classAttendances.length}</p>
                  <p className="text-xs text-muted-foreground">sessions</p>
                </div>
              </CardContent>
            </Card>

            <Card className="luxury-card border-0">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <p className="text-xs text-muted-foreground">Total Events</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {chapelAttendances.length + classAttendances.length}
                  </p>
                  <p className="text-xs text-muted-foreground">all time</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Check-in History Graph */}
          <Card className="luxury-card border-0">
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-tight uppercase">
                Check-in History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {checkIns.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <XCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No check-in records found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {checkIns.slice(0, 10).map((checkIn: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{checkIn.weekend?.name || "Unknown Weekend"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(checkIn.checkedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                  {checkIns.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing 10 of {checkIns.length} check-ins
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chapel Passport */}
          <AttendancePassport
            attendances={chapelAttendances as any}
            weekends={student.weekends as any}
            type="CHAPEL"
            studentId={student.id}
          />

          {/* Class Passport */}
          {/* <AttendancePassport
            attendances={classAttendances as any}
            weekends={student.weekends as any}
            type="CLASS"
            studentId={student.id}
          /> */}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Student Permanently
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {student.fullName}?
              This action cannot be undone. All attendance records, check-in history,
              and associated data for this student will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
