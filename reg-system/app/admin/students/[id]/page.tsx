import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";
import { getStudentByAdmissionWithHistory } from "@/app/actions/students";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfilePictureDisplay } from "@/components/profile-picture";
import { AttendancePassport } from "@/components/attendance-passport";
import { User, Hash, Phone, MapPin, CreditCard, BookOpen, ShieldAlert } from "lucide-react";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const student = await getStudentByAdmissionWithHistory(params.id);

  if (!student) {
    redirect("/admin/students");
  }

  const chapelAttendances = student.attendances.filter((att) => att.session.sessionType === "CHAPEL");
  const classAttendances = student.attendances.filter((att) => att.session.sessionType === "CLASS");

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin/students" />

        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2">
            Student Details & Analytics
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            View complete profile, attendance records, and analytics for {student.fullName}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card className="luxury-card border-0 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-tight uppercase">
                Student Profile
              </CardTitle>
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

          {/* Attendance Passports */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attendance Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="luxury-card border-0">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Chapel Attendance</p>
                      <p className="text-2xl font-bold">{chapelAttendances.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="luxury-card border-0">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Class Attendance</p>
                      <p className="text-2xl font-bold">{classAttendances.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chapel Passport */}
            <AttendancePassport
              attendances={chapelAttendances as any}
              weekends={student.weekends as any}
              type="CHAPEL"
              studentId={student.id}
            />

            {/* Class Passport */}
            <AttendancePassport
              attendances={classAttendances as any}
              weekends={student.weekends as any}
              type="CLASS"
              studentId={student.id}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
