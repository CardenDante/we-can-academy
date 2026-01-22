import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { getTeacherStudentById } from "@/app/actions/teachers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { ProfilePictureDisplay } from "@/components/profile-picture";
import { AttendancePassport } from "@/components/attendance-passport";
import { Badge } from "@/components/ui/badge";
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
  const classAttendances = student.attendances.filter((att: any) => att.session.sessionType === "CLASS");
  const chapelAttendances = student.attendances.filter((att: any) => att.session.sessionType === "CHAPEL");

  const classAttendanceCount = classAttendances.length;
  const chapelAttendanceCount = chapelAttendances.length;
  const checkInCount = student.checkIns.length;

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name || "Teacher", role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/teacher/students" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
            Student Profile
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            View student details and attendance records
          </p>
        </div>

        <div className="space-y-6">
          {/* Student Details and Class Attendance - Grid Layout */}
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
                    profilePictureUrl={student.profilePicture}
                    gender={student.gender}
                    size="lg"
                  />
                </div>

                {/* Name and Admission Number */}
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

                {student.hasWarning && (
                  <div className="flex justify-center mb-2">
                    <Badge variant="destructive" className="text-xs">
                      Has Warning
                    </Badge>
                  </div>
                )}

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

                  <div className="flex justify-between py-1 border-b">
                    <span className="text-sm text-muted-foreground">Area:</span>
                    <span className="text-sm">{student.areaOfResidence}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b">
                    <span className="text-sm text-muted-foreground">ID/Passport:</span>
                    <span className="text-sm">{student.identification}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b">
                    <span className="text-sm text-muted-foreground">Church District:</span>
                    <span className="text-sm">{student.churchDistrict}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Class Attendance Passport - Spans 2 columns on xl */}
            <div className="xl:col-span-2 flex">
              <AttendancePassport
                attendances={classAttendances}
                weekends={student.weekends}
                type="CLASS"
                studentId={student.id}
                className="flex-1"
              />
            </div>
          </div>

          {/* Chapel Attendance Passport - Full width */}
          <AttendancePassport
            attendances={chapelAttendances}
            weekends={student.weekends}
            type="CHAPEL"
            studentId={student.id}
          />

          {/* Check-In Records - Full width */}
          {student.checkIns && student.checkIns.length > 0 && (
            <Card className="luxury-card border-0">
              <CardHeader className="pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase">
                    Gate Check-In Records
                  </CardTitle>
                  <Badge variant="default" className="bg-blue-500 w-fit">
                    Total: {student.checkIns.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
                  {student.checkIns.map((checkIn: any) => {
                    const checkInDate = new Date(checkIn.checkedAt);
                    const dayName = checkInDate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
                    const monthDay = checkInDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
                    const timeStamp = checkInDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    }).toLowerCase();

                    return (
                      <div key={checkIn.id} className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white font-bold stroke-[3]" />
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-medium">{dayName}, {monthDay}</div>
                          <div className="text-[10px] text-muted-foreground">{timeStamp}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
