import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSessions, getWeekends, getClasses } from "@/app/actions/academy";
import { CreateSessionForm } from "./create-session-form";
import { DeleteSessionButton } from "./delete-session-button";
import { ManageSessionClasses } from "./manage-session-classes";
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Sessions</h2>
          <p className="text-muted-foreground">Create sessions and assign classes</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>All Sessions</CardTitle>
              <CardDescription>
                {sessions.length} session{sessions.length !== 1 ? "s" : ""} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Weekend</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Session Name</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.weekend.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{session.day}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={session.sessionType === "CLASS" ? "default" : "secondary"}>
                            {session.sessionType}
                          </Badge>
                        </TableCell>
                        <TableCell>{session.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {session.startTime} - {session.endTime}
                        </TableCell>
                        <TableCell>
                          <ManageSessionClasses
                            sessionId={session.id}
                            sessionClasses={session.sessionClasses}
                            allClasses={classes}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <DeleteSessionButton sessionId={session.id} sessionName={session.name} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {sessions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No sessions created yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Session</CardTitle>
              <CardDescription>Add a new session to a weekend</CardDescription>
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
