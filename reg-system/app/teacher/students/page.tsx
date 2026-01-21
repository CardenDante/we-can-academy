import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { User, MapPin, Phone, IdCard } from "lucide-react";

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
      <div className="p-6">
        <Header user={{ name: user.name || "Teacher", role: user.role }} />
        <div className="mt-6">
          <h2 className="text-2xl font-bold">My Students</h2>
          <p className="text-muted-foreground mt-2">Teacher profile not found</p>
        </div>
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
    <div className="p-6">
      <Header user={{ name: user.name || "Teacher", role: user.role }} />
      <div className="mt-6">
        <h2 className="text-2xl font-bold">My Students</h2>
        <p className="text-muted-foreground mt-2">{`${teacher.class.course.name} - ${teacher.class.name} (${students.length} student${students.length !== 1 ? "s" : ""})`}</p>
      </div>

      {students.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <div className="text-muted-foreground">
            <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No students assigned to your class yet.</p>
          </div>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/teacher/students/${student.id}`}
              className="block"
            >
              <Card className="hover:border-primary transition-colors cursor-pointer overflow-hidden h-full">
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {student.profilePicture ? (
                        <Image
                          src={student.profilePicture}
                          alt={student.fullName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
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
    </div>
  );
}
