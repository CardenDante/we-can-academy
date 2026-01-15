import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSessions, getWeekends, getClasses } from "@/app/actions/academy";
import { CreateSessionForm } from "./create-session-form";
import { DeleteSessionButton } from "./delete-session-button";
import { ManageSessionClasses } from "./manage-session-classes";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";

export default async function SessionsPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const [sessions, weekends, classes] = await Promise.all([
    getSessions(),
    getWeekends(),
    getClasses(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2 sm:mb-3">
            Sessions Management
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Create sessions and assign classes
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3">
          <Card className="luxury-card border-0 lg:col-span-2 order-2 lg:order-1">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">All Sessions</CardTitle>
              <CardDescription className="text-sm font-light">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""} configured
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4 sm:pl-4">Weekend</TableHead>
                      <TableHead className="hidden sm:table-cell">Day</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead>Session Name</TableHead>
                      <TableHead className="hidden lg:table-cell">Time</TableHead>
                      <TableHead className="hidden xl:table-cell">Classes</TableHead>
                      <TableHead className="text-right pr-4 sm:pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium pl-4 sm:pl-4">{session.weekend.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs">{session.day}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={session.sessionType === "CLASS" ? "default" : "secondary"} className="text-xs">
                            {session.sessionType}
                          </Badge>
                        </TableCell>
                        <TableCell>{session.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                          {session.startTime} - {session.endTime}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <ManageSessionClasses
                            sessionId={session.id}
                            sessionClasses={session.sessionClasses}
                            allClasses={classes}
                          />
                        </TableCell>
                        <TableCell className="text-right pr-4 sm:pr-4">
                          <DeleteSessionButton sessionId={session.id} sessionName={session.name} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {sessions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          No sessions created yet
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
              <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">Create Session</CardTitle>
              <CardDescription className="text-sm font-light">Add a new session to a weekend</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateSessionForm weekends={weekends} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
