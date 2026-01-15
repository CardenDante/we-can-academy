import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClasses, getCourses } from "@/app/actions/academy";
import { CreateClassForm } from "./create-class-form";
import { DeleteClassButton } from "./delete-class-button";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";

export default async function ClassesPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const [classes, courses] = await Promise.all([getClasses(), getCourses()]);

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2 sm:mb-3">
            Classes Management
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Create and manage class divisions (A, B, C) for courses
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3">
          <Card className="luxury-card border-0 lg:col-span-2 order-2 lg:order-1">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">All Classes</CardTitle>
              <CardDescription className="text-sm font-light">
                {classes.length} class{classes.length !== 1 ? "es" : ""} configured
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-4">Class Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Course</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium pl-4 sm:pl-4">{cls.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{cls.course.name}</TableCell>
                      <TableCell className="text-right pr-4 sm:pr-4">
                        <DeleteClassButton classId={cls.id} className={cls.name} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {classes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                        No classes created yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="luxury-card border-0 order-1 lg:order-2">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">Create Class</CardTitle>
              <CardDescription className="text-sm font-light">Add a new class division</CardDescription>
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
