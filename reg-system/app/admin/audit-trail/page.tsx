import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, CheckCircle, UserPlus, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { AuditTrailList } from "@/components/audit-trail-list";

export default async function AuditTrailPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    return <div>Unauthorized</div>;
  }

  // Fetch all activities (increased limits for pagination)
  const [recentAttendances, recentCheckIns, recentUsers, recentStudents] =
    await Promise.all([
      // Recent attendance records
      prisma.attendance.findMany({
        take: 100,
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
        take: 100,
        orderBy: { checkedAt: "desc" },
        include: {
          student: true,
          weekend: true,
        },
      }),

      // Recent users created
      prisma.user.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
      }),

      // Recent students registered
      prisma.student.findMany({
        take: 50,
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
          <AuditTrailList activities={activities} />
        </div>
      </main>
    </div>
  );
}
