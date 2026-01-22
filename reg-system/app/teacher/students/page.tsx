import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { User, MapPin, Phone, IdCard } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { ProfilePictureDisplay } from "@/components/profile-picture";

export default async function TeacherStudentsPage() {
  const user = await getUser();
  if (!user || user.role !== "TEACHER") {
    redirect("/");
  }

  // Get teacher's information
  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    include: {
      class: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={{ name: user.name || "Teacher", role: user.role }} />
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <BackButton href="/teacher" />

          <div className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
              My Students
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground font-light">
              Teacher profile not found
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Get all students in the teacher's COURSE (not restricted to specific class)
  const students = await prisma.student.findMany({
    where: {
      courseId: teacher.class.courseId,
      isExpelled: false,
    },
    include: {
      course: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name || "Teacher", role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/teacher" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
            My Students
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            {`${teacher.class.course.name} - ${teacher.class.name} (${students.length} student${students.length !== 1 ? "s" : ""})`}
          </p>
        </div>

        {students.length === 0 ? (
          <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No students assigned to your class yet.</p>
          </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/teacher/students/${student.id}`}
                className="block"
              >
                <Card className="hover:border-primary transition-colors cursor-pointer overflow-hidden h-full">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <ProfilePictureDisplay
                        profilePictureUrl={student.profilePicture}
                        gender={student.gender}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {student.fullName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {student.admissionNumber}
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {student.areaOfResidence}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {student.phoneNumber}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
