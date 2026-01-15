import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCourses } from "@/app/actions/academy";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";

export default async function CoursesPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const courses = await getCourses();

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2 sm:mb-3">
            Courses
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            View available courses in the academy
          </p>
        </div>

        <Card className="luxury-card border-0">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">All Courses</CardTitle>
            <CardDescription className="text-sm font-light">
              {courses.length} course{courses.length !== 1 ? "s" : ""} available
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 sm:pl-4">Course Name</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center pr-4 sm:pr-4">Classes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium pl-4 sm:pl-4">{course.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        {course._count.students}
                      </span>
                    </TableCell>
                    <TableCell className="text-center pr-4 sm:pr-4">
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-600">
                        {course._count.classes}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {courses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                      No courses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
