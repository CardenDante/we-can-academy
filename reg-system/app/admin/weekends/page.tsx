import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWeekends } from "@/app/actions/academy";
import { CreateWeekendForm } from "./create-weekend-form";
import { DeleteWeekendButton } from "./delete-weekend-button";
import { redirect } from "next/navigation";

export default async function WeekendsPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const weekends = await getWeekends();

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Weekends</h2>
          <p className="text-muted-foreground">Create and manage academy weekends</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>All Weekends</CardTitle>
              <CardDescription>
                {weekends.length} weekend{weekends.length !== 1 ? "s" : ""} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Weekend Name</TableHead>
                    <TableHead>Saturday Date</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekends.map((weekend) => (
                    <TableRow key={weekend.id}>
                      <TableCell className="font-medium">{weekend.name}</TableCell>
                      <TableCell>
                        {new Date(weekend.saturdayDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                          {weekend._count.sessions}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteWeekendButton weekendId={weekend.id} weekendName={weekend.name} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {weekends.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No weekends created yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Weekend</CardTitle>
              <CardDescription>Add a new academy weekend</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateWeekendForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
