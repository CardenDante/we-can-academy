import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClasses, getCourses } from "@/app/actions/academy";
import { CreateClassForm } from "./create-class-form";
import { DeleteClassButton } from "./delete-class-button";
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Classes</h2>
          <p className="text-muted-foreground">Create and manage class divisions (A, B, C) for courses</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>All Classes</CardTitle>
              <CardDescription>
                {classes.length} class{classes.length !== 1 ? "es" : ""} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.course.name}</TableCell>
                      <TableCell className="text-right">
                        <DeleteClassButton classId={cls.id} className={cls.name} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {classes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No classes created yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Class</CardTitle>
              <CardDescription>Add a new class division</CardDescription>
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
