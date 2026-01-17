import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWeekends } from "@/app/actions/academy";
import { CreateWeekendForm } from "./create-weekend-form";
import { DeleteWeekendButton } from "./delete-weekend-button";
import { GenerateRemainingButton } from "./generate-remaining-button";
import { BackButton } from "@/components/back-button";
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
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2 sm:mb-3">
            Weekends Management
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Create and manage academy weekends
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <Card className="luxury-card border-0 flex-1 order-2 lg:order-1">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">All Weekends</CardTitle>
              <CardDescription className="text-sm font-light">
                {weekends.length} weekend{weekends.length !== 1 ? "s" : ""} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-4">Weekend Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Saturday Date</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekends.map((weekend) => (
                    <TableRow key={weekend.id}>
                      <TableCell className="font-medium pl-4 sm:pl-4">{weekend.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
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
                      <TableCell className="text-right pr-4 sm:pr-4">
                        <DeleteWeekendButton weekendId={weekend.id} weekendName={weekend.name} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {weekends.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        No weekends created yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <div className="w-full lg:w-[380px] lg:sticky lg:top-6 order-1 lg:order-2 shrink-0 space-y-6">
            <Card className="luxury-card border-0">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">Quick Actions</CardTitle>
                <CardDescription className="text-sm font-light">Generate remaining weekends</CardDescription>
              </CardHeader>
              <CardContent>
                <GenerateRemainingButton currentCount={weekends.length} />
              </CardContent>
            </Card>

            <Card className="luxury-card border-0">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">Create Weekend</CardTitle>
                <CardDescription className="text-sm font-light">Add a new academy weekend</CardDescription>
              </CardHeader>
              <CardContent>
                <CreateWeekendForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
