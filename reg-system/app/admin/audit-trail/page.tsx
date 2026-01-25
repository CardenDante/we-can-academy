import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, CheckCircle, UserPlus, Users, Calendar, Settings } from "lucide-react";
import Link from "next/link";

export default async function AuditTrailPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    return <div>Unauthorized</div>;
  }

  // Fetch recent activities
  const [recentAttendances, recentCheckIns, recentUsers, recentStudents] =
    await Promise.all([
      // Recent attendance records
      prisma.attendance.findMany({
        take: 20,
        orderBy: { markedAt: "desc" },
        include: {
          student: true,
          session: {
            include: {
              weekend: true,
            },
          },
        },
      }),

      // Recent check-ins
      prisma.checkIn.findMany({
        take: 20,
        orderBy: { checkedAt: "desc" },
        include: {
          student: true,
          weekend: true,
        },
      }),

      // Recent users created
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),

      // Recent students registered
      prisma.student.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          course: true,
        },
      }),
    ]);

  // Combine all activities into a single timeline
  const activities: Array<{
    id: string;
    type: "attendance" | "checkin" | "user" | "student";
    timestamp: Date;
    description: string;
    actor?: string;
    icon: typeof CheckCircle;
    color: string;
  }> = [];

  // Add attendance activities
  recentAttendances.forEach((att) => {
    activities.push({
      id: att.id,
      type: "attendance",
      timestamp: att.markedAt,
      description: `${att.student.fullName} marked present for ${att.session.name}`,
      actor: att.markedBy,
      icon: CheckCircle,
      color: "text-green-500",
    });
  });

  // Add check-in activities
  recentCheckIns.forEach((check) => {
    activities.push({
      id: check.id,
      type: "checkin",
      timestamp: check.checkedAt,
      description: `${check.student.fullName} checked in for ${check.weekend.name} (${check.day})`,
      actor: check.checkedBy,
      icon: Calendar,
      color: "text-blue-500",
    });
  });

  // Add user creation activities
  recentUsers.forEach((u) => {
    activities.push({
      id: u.id,
      type: "user",
      timestamp: u.createdAt,
      description: `New ${u.role} user created: ${u.name} (@${u.username})`,
      icon: UserPlus,
      color: "text-purple-500",
    });
  });

  // Add student registration activities
  recentStudents.forEach((s) => {
    activities.push({
      id: s.id,
      type: "student",
      timestamp: s.createdAt,
      description: `New student registered: ${s.fullName} (${s.admissionNumber}) - ${s.course.name}`,
      icon: Users,
      color: "text-orange-500",
    });
  });

  // Sort all activities by timestamp
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Take top 100 most recent
  const topActivities = activities.slice(0, 100);

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Audit Trail</h2>
            <p className="text-muted-foreground mt-2">
              System activity and audit logs
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <p className="text-sm text-muted-foreground">
                Last 100 system events
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                    >
                      <div
                        className={`mt-1 p-2 rounded-full bg-${activity.color.replace("text-", "")}/10`}
                      >
                        <Icon className={`h-4 w-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(activity.timestamp, {
                              addSuffix: true,
                            })}
                          </span>
                          {activity.actor && (
                            <>
                              <span>•</span>
                              <span>by {activity.actor}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {topActivities.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
