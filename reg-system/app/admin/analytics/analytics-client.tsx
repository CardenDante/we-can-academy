"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type CheckInStats = {
  totalCheckIns: number;
  totalStudents: number;
  checkInRate: number;
  byCourse: { courseName: string; count: number; totalStudents: number }[];
  missedCheckIns: { admissionNumber: string; fullName: string; courseName: string }[];
  weekendOver: boolean;
};

type CheckInTrend = {
  weekendName: string;
  saturdayDate: string;
  saturdayCheckIns: number;
  sundayCheckIns: number;
  totalCheckIns: number;
};

type ChapelAttendanceStats = {
  weekendName: string;
  saturdayDate: string;
  totalAttendances: number;
  courseBreakdown: { name: string; count: number }[];
};

type Props = {
  checkInStats: CheckInStats;
  checkInTrends: CheckInTrend[];
  chapelAttendanceStats: ChapelAttendanceStats[];
};

const COLORS = [
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#14b8a6", // teal
];

export function AnalyticsClient({ checkInStats, checkInTrends, chapelAttendanceStats }: Props) {
  const checkedInCount = checkInStats.totalCheckIns;
  const notCheckedInCount = checkInStats.totalStudents - checkInStats.totalCheckIns;
  const checkInRate = Math.round(checkInStats.checkInRate);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="luxury-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{checkInStats.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Checked In Today</p>
                <p className="text-2xl font-bold text-green-600">{checkedInCount}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Not Checked In</p>
                <p className="text-2xl font-bold text-amber-600">{notCheckedInCount}</p>
              </div>
              <UserX className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Check-In Rate</p>
                <p className="text-2xl font-bold text-blue-600">{checkInRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-In Trends Chart */}
        <Card className="luxury-card border-0">
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-tight uppercase">
              Check-In Trends
            </CardTitle>
            <CardDescription className="text-sm font-light">
              Last 12 weekends gate check-ins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={checkInTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="weekendName"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="saturdayCheckIns"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Saturday"
                />
                <Line
                  type="monotone"
                  dataKey="sundayCheckIns"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Sunday"
                />
                <Line
                  type="monotone"
                  dataKey="totalCheckIns"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chapel Attendance Trends */}
        <Card className="luxury-card border-0">
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-tight uppercase">
              Chapel Attendance Trends
            </CardTitle>
            <CardDescription className="text-sm font-light">
              Last 12 weekends chapel attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chapelAttendanceStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="weekendName"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="totalAttendances"
                  fill="#8b5cf6"
                  name="Total Attendances"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Check-Ins by Course */}
      <Card className="luxury-card border-0">
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-tight uppercase">
            Today's Check-Ins by Course
          </CardTitle>
          <CardDescription className="text-sm font-light">
            Distribution of gate check-ins across courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checkInStats.byCourse.map((course, index) => {
              const percentage = course.totalStudents > 0
                ? Math.round((course.count / course.totalStudents) * 100)
                : 0;
              return (
                <div key={course.courseName} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{course.courseName}</span>
                    <span className="text-muted-foreground">
                      {course.count} / {course.totalStudents} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Students Who Checked In But Didn't Attend Chapel - Only show after weekend is over */}
      {checkInStats.weekendOver ? (
        <>
          {checkInStats.missedCheckIns.length > 0 && (
            <Card className="luxury-card border-0">
              <CardHeader>
                <CardTitle className="text-base font-medium tracking-tight uppercase flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Students Who Checked In But Didn't Attend Chapel
                </CardTitle>
                <CardDescription className="text-sm font-light">
                  These students checked in at the gate but were not marked present in chapel sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4 sm:pl-4">Admission #</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead className="text-right pr-4 sm:pr-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkInStats.missedCheckIns.map((student) => (
                        <TableRow key={student.admissionNumber}>
                          <TableCell className="font-mono text-sm pl-4 sm:pl-4">
                            {student.admissionNumber}
                          </TableCell>
                          <TableCell className="font-medium">{student.fullName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{student.courseName}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-4 sm:pr-4">
                            <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <AlertTriangle className="h-3 w-3" />
                              Missed Chapel
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {checkInStats.missedCheckIns.length === 0 && checkInStats.totalCheckIns > 0 && (
            <Card className="luxury-card border-0 bg-green-500/5 border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                  <p className="font-medium">
                    All students who checked in at the gate have attended chapel sessions.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="luxury-card border-0 bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-blue-600">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <p className="font-medium">Weekend In Progress</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Chapel attendance data will be available after Sunday. Students still have time to attend chapel sessions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
