import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { getTeacherStudentById } from "@/app/actions/teachers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import Image from "next/image";
import {
  User,
  MapPin,
  Phone,
  IdCard,
  School,
  Calendar,
  CheckCircle,
  Church,
} from "lucide-react";

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user || user.role !== "TEACHER") {
    redirect("/");
  }

  const { id } = await params;
  let student;

  try {
    student = await getTeacherStudentById(id);
  } catch (error) {
    redirect("/teacher/students");
  }

  // Calculate attendance stats
  const classAttendanceCount = student.attendances.length;
  const chapelCheckInCount = student.checkIns.filter(
    (c) => c.status === "PRESENT"
  ).length;

  // Get unique weekends attended
  const weekendsAttended = new Set(
    student.checkIns
      .filter((c) => c.status === "PRESENT")
      .map((c) => c.weekendId)
  ).size;

  return (
    <div className="p-6">
      <BackButton href="/teacher/students" />

      <Header user={{ name: user.name || "Teacher", role: user.role }} />
      <div className="mt-6">
        <h2 className="text-2xl font-bold">Student Profile</h2>
        <p className="text-muted-foreground mt-2">View student details and attendance records</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Student Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative h-32 w-32 rounded-full overflow-hidden bg-muted">
                {student.profilePicture ? (
                  <Image
                    src={student.profilePicture}
                    alt={student.fullName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <User className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-center">
                {student.fullName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {student.admissionNumber}
              </p>
              {student.hasWarning && (
                <div className="mt-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                  Has Warning
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-start gap-3">
                <School className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Course</p>
                  <p className="font-medium">{student.course.name}</p>
                </div>
              </div>


              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="font-medium">{student.areaOfResidence}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{student.phoneNumber}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IdCard className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">ID/Passport</p>
                  <p className="font-medium">{student.identification}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Church className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Church District</p>
                  <p className="font-medium">{student.churchDistrict}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Class Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <p className="text-2xl font-bold">{classAttendanceCount}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  sessions attended
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Chapel Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Church className="h-5 w-5 text-blue-500" />
                  <p className="text-2xl font-bold">{chapelCheckInCount}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  times checked in
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Weekends Attended
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  <p className="text-2xl font-bold">{weekendsAttended}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  weekends present
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Class Attendance History */}
          <Card>
            <CardHeader>
              <CardTitle>Class Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              {student.attendances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 opacity-50 mb-3" />
                  <p>No class attendance records yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {student.attendances.map((attendance) => (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {attendance.session.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(
                              attendance.session.weekend.saturdayDate
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            - {attendance.session.day}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(attendance.markedAt).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {attendance.markedBy}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chapel Check-in History */}
          <Card>
            <CardHeader>
              <CardTitle>Chapel Check-in History</CardTitle>
            </CardHeader>
            <CardContent>
              {student.checkIns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Church className="mx-auto h-12 w-12 opacity-50 mb-3" />
                  <p>No check-in records yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {student.checkIns.map((checkIn) => (
                    <div
                      key={checkIn.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        checkIn.status === "PRESENT"
                          ? "bg-card hover:bg-muted/50"
                          : "bg-muted/50 opacity-75"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            checkIn.status === "PRESENT"
                              ? "bg-blue-100 dark:bg-blue-900/20"
                              : "bg-gray-100 dark:bg-gray-900/20"
                          }`}
                        >
                          {checkIn.status === "PRESENT" ? (
                            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Church className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {checkIn.weekend.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {checkIn.day} -{" "}
                            {new Date(
                              checkIn.weekend.saturdayDate
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {checkIn.status === "PRESENT" ? (
                          <>
                            <p className="text-sm font-medium">
                              {new Date(checkIn.checkedAt).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                }
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {checkIn.checkedBy}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Missed
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
