import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSessions, getWeekends, getClasses, getCourses } from "@/app/actions/academy";
import { CreateSessionForm } from "./create-session-form";
import { SessionsByCourseView } from "./sessions-by-course-view";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";

export default async function SessionsPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const [sessions, weekends, classes, courses] = await Promise.all([
    getSessions(),
    getWeekends(),
    getClasses(),
    getCourses(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2 sm:mb-3">
            Chapel Sessions
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Create and manage chapel sessions
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 order-2 lg:order-1">
            <SessionsByCourseView
              sessions={sessions}
              classes={classes}
              courses={courses}
            />
          </div>

          <Card className="luxury-card border-0 w-full lg:w-[380px] lg:sticky lg:top-6 order-1 lg:order-2 shrink-0">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">Create Chapel Session</CardTitle>
              <CardDescription className="text-sm font-light">Creates chapel session for all {weekends.length} weekends automatically</CardDescription>
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
