import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClasses, getCourses } from "@/app/actions/academy";
import { CreateClassForm } from "./create-class-form";
import { DeleteClassButton } from "./delete-class-button";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";
import { BookOpen, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ClassesPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const [classes, courses] = await Promise.all([getClasses(), getCourses()]);

  // Group classes by course
  const classesByCourse = courses.map((course) => ({
    course,
    classes: classes.filter((cls) => cls.courseId === course.id),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2 sm:mb-3">
            Classes Management
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Create and manage class divisions (A, B, C) for courses
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Classes grouped by course */}
          <div className="flex-1 order-2 lg:order-1 space-y-6">
            {classesByCourse.map(({ course, classes: courseClasses }) => (
              <Card key={course.id} className="luxury-card border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium tracking-tight">
                          {course.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-light">
                          {courseClasses.length} class{courseClasses.length !== 1 ? "es" : ""}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {courseClasses.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No classes created for this course yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {courseClasses.map((cls) => (
                        <div
                          key={cls.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{cls.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {course.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/classes/${cls.id}/sessions`}>
                              <Button variant="outline" size="sm">
                                Manage Sessions
                              </Button>
                            </Link>
                            <DeleteClassButton classId={cls.id} className={cls.name} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {classesByCourse.length === 0 && (
              <Card className="luxury-card border-0">
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No courses available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create a course first to add classes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Create Class Form */}
          <Card className="luxury-card border-0 w-full lg:w-[380px] lg:sticky lg:top-6 order-1 lg:order-2 shrink-0">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase">
                Create Class
              </CardTitle>
              <CardDescription className="text-sm font-light">
                Add a new class division
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateClassForm courses={courses} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
