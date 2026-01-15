import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getStudents } from "@/app/actions/students";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";

export default async function StudentsPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const students = await getStudents();

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2 sm:mb-3">
            Students
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            View all registered students
          </p>
        </div>

        <Card className="luxury-card border-0">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">All Students</CardTitle>
            <CardDescription className="text-sm font-light">
              {students.length} student{students.length !== 1 ? "s" : ""} registered
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-4">Admission #</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Gender</TableHead>
                    <TableHead className="hidden md:table-cell">Course</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden xl:table-cell">Area</TableHead>
                    <TableHead className="hidden xl:table-cell">Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium pl-4 sm:pl-4">{student.admissionNumber}</TableCell>
                      <TableCell>{student.fullName}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={student.gender === "MALE" ? "default" : "secondary"}>
                          {student.gender}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{student.course.name}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{student.phoneNumber}</TableCell>
                      <TableCell className="hidden xl:table-cell text-sm">{student.areaOfResidence}</TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden xl:table-cell">
                        {new Date(student.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        No students registered yet
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
