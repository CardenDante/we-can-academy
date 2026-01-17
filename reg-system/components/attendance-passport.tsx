"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface AttendanceRecord {
  id: string;
  markedAt: Date;
  session: {
    id: string;
    weekend: {
      id: string;
      name: string;
      saturdayDate: Date;
    };
    day: "SATURDAY" | "SUNDAY";
    sessionType: "CLASS" | "CHAPEL";
  };
}

interface AttendancePassportProps {
  attendances: AttendanceRecord[];
  weekends: Array<{
    id: string;
    name: string;
    saturdayDate: Date;
  }>;
  type: "CLASS" | "CHAPEL";
  studentId: string;
}

export function AttendancePassport({ attendances, weekends, type, studentId }: AttendancePassportProps) {
  // Calculate attendance stats
  const getAttendanceForWeekend = (weekendId: string, day?: "SATURDAY" | "SUNDAY") => {
    return attendances.find(
      (att) =>
        att.session.weekend.id === weekendId &&
        att.session.sessionType === type &&
        (day ? att.session.day === day : true)
    );
  };

  const calculateStats = () => {
    let present = 0;
    let absent = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    weekends.forEach((weekend) => {
      const saturdayDate = new Date(weekend.saturdayDate);
      saturdayDate.setHours(0, 0, 0, 0);

      const sundayDate = new Date(weekend.saturdayDate);
      sundayDate.setDate(sundayDate.getDate() + 1);
      sundayDate.setHours(0, 0, 0, 0);

      if (type === "CHAPEL") {
        // Chapel: One attendance per weekend (either Sat OR Sun)
        const hasAttendance = attendances.some(
          (att) =>
            att.session.weekend.id === weekend.id && att.session.sessionType === "CHAPEL"
        );

        // Only count if Sunday has passed (meaning the whole weekend is over)
        if (sundayDate <= today) {
          if (hasAttendance) {
            present++;
          } else {
            absent++;
          }
        }
      } else {
        // CLASS: Two attendances per weekend (Sat AND Sun)
        const satAttendance = getAttendanceForWeekend(weekend.id, "SATURDAY");
        const sunAttendance = getAttendanceForWeekend(weekend.id, "SUNDAY");

        // Check if Saturday has passed
        if (saturdayDate <= today) {
          if (satAttendance) {
            present++;
          } else {
            absent++;
          }
        }

        // Check if Sunday has passed
        if (sundayDate <= today) {
          if (sunAttendance) {
            present++;
          } else {
            absent++;
          }
        }
      }
    });

    return { present, absent, total: present + absent };
  };

  const stats = calculateStats();

  return (
    <Card className="luxury-card border-0">
      <CardHeader className="pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">
            {type} Attendance Passport
          </CardTitle>
          <div className="flex gap-3">
            <Badge variant="default" className="bg-green-500">
              Present: {stats.present}
            </Badge>
            <Badge variant="destructive">Absent: {stats.absent}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {type === "CHAPEL" ? (
          <ChapelPassport
            weekends={weekends}
            getAttendanceForWeekend={getAttendanceForWeekend}
          />
        ) : (
          <ClassPassport
            weekends={weekends}
            getAttendanceForWeekend={getAttendanceForWeekend}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ChapelPassport({
  weekends,
  getAttendanceForWeekend,
}: {
  weekends: any[];
  getAttendanceForWeekend: (weekendId: string, day?: "SATURDAY" | "SUNDAY") => any;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
      {weekends.map((weekend) => {
        const attendance = getAttendanceForWeekend(weekend.id);
        const saturdayDate = new Date(weekend.saturdayDate);
        const sundayDate = new Date(weekend.saturdayDate);
        sundayDate.setDate(sundayDate.getDate() + 1);
        sundayDate.setHours(0, 0, 0, 0);
        const hasPassed = sundayDate <= today;
        const isPresent = !!attendance;
        const isAbsent = hasPassed && !attendance;

        // Use actual attendance date if present, otherwise show default Saturday date
        const displayDate = attendance
          ? new Date(attendance.markedAt)
          : saturdayDate;
        const dateDisplay = displayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        // Format time for watermark (e.g., "8:45am")
        const timeWatermark = attendance
          ? new Date(attendance.markedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }).toLowerCase()
          : null;

        return (
          <div key={weekend.id} className="flex flex-col items-center gap-2">
            <div
              className={`
                w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex items-center justify-center
                transition-all relative overflow-hidden
                ${
                  isPresent
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : isAbsent
                    ? "border-destructive bg-destructive/10"
                    : "border-border bg-background"
                }
              `}
            >
              {isPresent ? (
                <>
                  {/* Timestamp watermark in background */}
                  {timeWatermark && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[11px] sm:text-xs font-semibold text-black/30 dark:text-black/30 select-none">
                        {timeWatermark}
                      </span>
                    </div>
                  )}
                  {/* Check icon on top */}
                  <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 font-bold stroke-[3] relative z-10" />
                </>
              ) : isAbsent ? (
                <X className="w-8 h-8 sm:w-10 sm:h-10 text-destructive stroke-[3]" />
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs font-medium">{weekend.name.replace("Weekend ", "WK ")}</div>
              <div className="text-[10px] text-muted-foreground">{dateDisplay}</div>
              {attendance && (
                <div className="text-[10px] text-muted-foreground">
                  {attendance.session.day.slice(0, 3)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClassPassport({
  weekends,
  getAttendanceForWeekend,
}: {
  weekends: any[];
  getAttendanceForWeekend: (weekendId: string, day?: "SATURDAY" | "SUNDAY") => any;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      {weekends.map((weekend) => {
        const satAttendance = getAttendanceForWeekend(weekend.id, "SATURDAY");
        const sunAttendance = getAttendanceForWeekend(weekend.id, "SUNDAY");

        const saturdayDate = new Date(weekend.saturdayDate);
        saturdayDate.setHours(0, 0, 0, 0);

        const sundayDate = new Date(weekend.saturdayDate);
        sundayDate.setDate(sundayDate.getDate() + 1);
        sundayDate.setHours(0, 0, 0, 0);

        const satPassed = saturdayDate <= today;
        const sunPassed = sundayDate <= today;

        return (
          <div key={weekend.id} className="border rounded-lg p-4">
            <div className="text-sm font-medium mb-3">{weekend.name}</div>
            <div className="grid grid-cols-2 gap-4">
              {/* Saturday */}
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 flex items-center justify-center
                    ${
                      satAttendance
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : satPassed
                        ? "border-destructive bg-destructive/10"
                        : "border-border bg-background"
                    }
                  `}
                >
                  {satAttendance ? (
                    <Check className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 stroke-[3]" />
                  ) : satPassed ? (
                    <X className="w-6 h-6 sm:w-7 sm:h-7 text-destructive stroke-[3]" />
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">Sat</div>
                  <div className="text-xs text-muted-foreground">
                    {saturdayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>

              {/* Sunday */}
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 flex items-center justify-center
                    ${
                      sunAttendance
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : sunPassed
                        ? "border-destructive bg-destructive/10"
                        : "border-border bg-background"
                    }
                  `}
                >
                  {sunAttendance ? (
                    <Check className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 stroke-[3]" />
                  ) : sunPassed ? (
                    <X className="w-6 h-6 sm:w-7 sm:h-7 text-destructive stroke-[3]" />
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">Sun</div>
                  <div className="text-xs text-muted-foreground">
                    {sundayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
