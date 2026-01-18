"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DeleteSessionButton } from "./delete-session-button";
import { ManageSessionClasses } from "./manage-session-classes";

type Session = {
  id: string;
  name: string;
  day: "SATURDAY" | "SUNDAY";
  sessionType: "CLASS" | "CHAPEL";
  startTime: string;
  endTime: string;
  weekend: {
    id: string;
    name: string;
    saturdayDate: Date;
  };
  sessionClasses: any[];
};

type Class = {
  id: string;
  name: string;
  courseId: string;
  course: {
    id: string;
    name: string;
  };
};

type Course = {
  id: string;
  name: string;
};

type Weekend = {
  id: string;
  name: string;
  saturdayDate: Date;
};

export function SessionsGroupedView({
  sessions,
  classes,
  courses,
  weekends,
}: {
  sessions: Session[];
  classes: Class[];
  courses: Course[];
  weekends: Weekend[];
}) {
  const [expandedWeekends, setExpandedWeekends] = useState<Set<string>>(new Set([weekends[0]?.id]));
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  // Group sessions by weekend
  const sessionsByWeekend = sessions.reduce((acc, session) => {
    const weekendId = session.weekend.id;
    if (!acc[weekendId]) {
      acc[weekendId] = [];
    }
    acc[weekendId].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  // Get classes grouped by course
  const classesByCourse = classes.reduce((acc, cls) => {
    const courseId = cls.courseId;
    if (!acc[courseId]) {
      acc[courseId] = [];
    }
    acc[courseId].push(cls);
    return acc;
  }, {} as Record<string, Class[]>);

  const toggleWeekend = (weekendId: string) => {
    setExpandedWeekends((prev) => {
      const next = new Set(prev);
      if (next.has(weekendId)) {
        next.delete(weekendId);
      } else {
        next.add(weekendId);
      }
      return next;
    });
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  // Sort weekends by date (most recent first)
  const sortedWeekends = [...weekends].sort(
    (a, b) => new Date(b.saturdayDate).getTime() - new Date(a.saturdayDate).getTime()
  );

  return (
    <div className="space-y-4">
      <Card className="luxury-card border-0">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase">All Sessions</CardTitle>
          <CardDescription className="text-sm font-light">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedWeekends.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              No weekends created yet. Create a weekend first.
            </div>
          )}

          {sortedWeekends.map((weekend) => {
            const weekendSessions = sessionsByWeekend[weekend.id] || [];
            const isExpanded = expandedWeekends.has(weekend.id);

            return (
              <Card key={weekend.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={() => toggleWeekend(weekend.id)}
                      className="flex items-center gap-2 h-auto p-0 hover:bg-transparent"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <div className="text-left">
                        <div className="font-semibold text-lg">{weekend.name}</div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {new Date(weekend.saturdayDate).toLocaleDateString()} - {weekendSessions.length} session{weekendSessions.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {weekendSessions.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 text-sm">
                        No sessions for this weekend
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Group by course for CLASS sessions */}
                        {courses.map((course) => {
                          const courseSessions = weekendSessions.filter(
                            (session) =>
                              session.sessionType === "CLASS" &&
                              session.sessionClasses.some((sc) => sc.class.courseId === course.id)
                          );

                          // Also include CLASS sessions with no classes assigned
                          const unassignedClassSessions = weekendSessions.filter(
                            (session) =>
                              session.sessionType === "CLASS" && session.sessionClasses.length === 0
                          );

                          if (courseSessions.length === 0 && course.id !== "unassigned") return null;

                          const isCourseExpanded = expandedCourses.has(course.id);

                          return (
                            <div key={course.id} className="border rounded p-3 bg-accent/20">
                              <Button
                                variant="ghost"
                                onClick={() => toggleCourse(course.id)}
                                className="flex items-center gap-2 h-auto p-0 hover:bg-transparent mb-2 w-full justify-start"
                              >
                                {isCourseExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <Badge variant="default" className="text-xs">
                                  {course.name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {courseSessions.length} session{courseSessions.length !== 1 ? "s" : ""}
                                </span>
                              </Button>

                              {isCourseExpanded && (
                                <div className="space-y-2 ml-6">
                                  {courseSessions.map((session) => (
                                    <SessionCard
                                      key={session.id}
                                      session={session}
                                      classes={classes}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Show unassigned CLASS sessions */}
                        {weekendSessions
                          .filter((s) => s.sessionType === "CLASS" && s.sessionClasses.length === 0)
                          .map((session) => (
                            <SessionCard
                              key={session.id}
                              session={session}
                              classes={classes}
                              showUnassigned
                            />
                          ))}

                        {/* Show CHAPEL sessions separately */}
                        {weekendSessions
                          .filter((s) => s.sessionType === "CHAPEL")
                          .map((session) => (
                            <SessionCard
                              key={session.id}
                              session={session}
                              classes={classes}
                            />
                          ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionCard({
  session,
  classes,
  showUnassigned = false,
}: {
  session: Session;
  classes: Class[];
  showUnassigned?: boolean;
}) {
  return (
    <div className="border rounded p-4 bg-background space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {session.day}
            </Badge>
            <Badge
              variant={session.sessionType === "CLASS" ? "default" : "secondary"}
              className="text-xs"
            >
              {session.sessionType}
            </Badge>
            {showUnassigned && (
              <Badge variant="destructive" className="text-xs">
                No Classes Assigned
              </Badge>
            )}
          </div>
          <div className="font-medium">{session.name}</div>
          <div className="text-sm text-muted-foreground">
            {session.startTime} - {session.endTime}
          </div>
        </div>
        <DeleteSessionButton sessionId={session.id} sessionName={session.name} />
      </div>

      {session.sessionType === "CLASS" && (
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-2">Assigned Classes:</div>
          <ManageSessionClasses
            sessionId={session.id}
            sessionClasses={session.sessionClasses}
            allClasses={classes}
          />
        </div>
      )}
    </div>
  );
}
