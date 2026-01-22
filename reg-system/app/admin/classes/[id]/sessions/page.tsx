import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { SessionAssignmentForm } from "./session-assignment-form";
import { RemoveSessionButton } from "./remove-session-button";

export default async function ClassSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const { id: classId } = await params;

  // Get class with course info
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      course: true,
    },
  });

  if (!classData) {
    redirect("/admin/classes");
  }

  // Get all sessions assigned to this class
  const assignedSessions = await prisma.sessionClass.findMany({
    where: { classId },
    include: {
      session: {
        include: {
          weekend: true,
        },
      },
    },
    orderBy: {
      session: {
        startTime: "asc",
      },
    },
  });

  // Get all available weekends with sessions
  const weekends = await prisma.weekend.findMany({
    include: {
      sessions: {
        where: {
          sessionType: "CLASS",
        },
        orderBy: {
          startTime: "asc",
        },
      },
    },
    orderBy: {
      saturdayDate: "desc",
    },
    take: 10,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin/classes" />

        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight uppercase text-foreground mb-2">
            Manage Class Sessions
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{classData.name}</span>
            <span>•</span>
            <span>{classData.course.name}</span>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Assigned Sessions */}
          <Card className="luxury-card border-0 flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium tracking-tight uppercase">
                Assigned Sessions
              </CardTitle>
              <CardDescription className="text-sm font-light">
                {assignedSessions.length} session{assignedSessions.length !== 1 ? "s" : ""} assigned to this class
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {assignedSessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sessions assigned yet</p>
                  <p className="text-sm mt-2">Use the form to assign sessions to this class</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Weekend</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedSessions.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(assignment.session.weekend.saturdayDate).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {assignment.session.day}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {assignment.session.startTime} - {assignment.session.endTime}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <RemoveSessionButton
                              sessionClassId={assignment.id}
                              classId={classId}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assign Session Form */}
          <Card className="luxury-card border-0 w-full lg:w-[400px] lg:sticky lg:top-6 shrink-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium tracking-tight uppercase">
                Assign Session
              </CardTitle>
              <CardDescription className="text-sm font-light">
                Add a class session to this class
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionAssignmentForm
                classId={classId}
                className={classData.name}
                weekends={JSON.parse(JSON.stringify(weekends))}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
