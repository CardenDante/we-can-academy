"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
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

export function SessionsByCourseView({
  sessions,
  classes,
  courses,
}: {
  sessions: Session[];
  classes: Class[];
  courses: Course[];
}) {
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set([courses[0]?.id]));
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

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

  const toggleClass = (classId: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const toggleDay = (dayKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };

  // Get unique session templates (same name, day, type, time = one template)
  const getUniqueTemplates = () => {
    const templates = new Map<string, Session & { weekendCount: number }>();

    sessions.forEach((session) => {
      const key = `${session.day}-${session.sessionType}-${session.name}-${session.startTime}-${session.endTime}`;

      if (templates.has(key)) {
        const existing = templates.get(key)!;
        existing.weekendCount++;
      } else {
        templates.set(key, { ...session, weekendCount: 1 });
      }
    });

    return Array.from(templates.values());
  };

  const uniqueTemplates = getUniqueTemplates();

  // Group templates by course → class → day
  const groupedData: Record<string, Record<string, Record<string, typeof uniqueTemplates>>> = {};

  uniqueTemplates.forEach((template) => {
    if (template.sessionType === "CHAPEL") {
      // Chapel sessions don't have classes
      const courseId = "chapel";
      const classId = "chapel";
      const day = template.day;

      if (!groupedData[courseId]) groupedData[courseId] = {};
      if (!groupedData[courseId][classId]) groupedData[courseId][classId] = {};
      if (!groupedData[courseId][classId][day]) groupedData[courseId][classId][day] = [];
      groupedData[courseId][classId][day].push(template);
    } else {
      // CLASS sessions - group by assigned classes
      if (template.sessionClasses.length === 0) {
        // Unassigned sessions
        const courseId = "unassigned";
        const classId = "unassigned";
        const day = template.day;

        if (!groupedData[courseId]) groupedData[courseId] = {};
        if (!groupedData[courseId][classId]) groupedData[courseId][classId] = {};
        if (!groupedData[courseId][classId][day]) groupedData[courseId][classId][day] = [];
        groupedData[courseId][classId][day].push(template);
      } else {
        // Group by each assigned class's course
        template.sessionClasses.forEach((sc) => {
          const courseId = sc.class.course.id;
          const classId = sc.class.id;
          const day = template.day;

          if (!groupedData[courseId]) groupedData[courseId] = {};
          if (!groupedData[courseId][classId]) groupedData[courseId][classId] = {};
          if (!groupedData[courseId][classId][day]) groupedData[courseId][classId][day] = [];
          groupedData[courseId][classId][day].push(template);
        });
      }
    }
  });

  // Filter to only show chapel sessions
  const chapelOnlyTemplates = uniqueTemplates.filter(t => t.sessionType === "CHAPEL");

  return (
    <Card className="luxury-card border-0">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">Chapel Sessions</CardTitle>
        <CardDescription className="text-sm font-light">
          Organized by Day
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {chapelOnlyTemplates.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No chapel sessions created yet
          </div>
        )}

        {/* Chapel Sessions */}
        {groupedData["chapel"] && (
          <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3 bg-purple-50 dark:bg-purple-950/20">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  CHAPEL
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {Object.values(groupedData["chapel"]["chapel"]).flat().length} session{Object.values(groupedData["chapel"]["chapel"]).flat().length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {Object.entries(groupedData["chapel"]["chapel"]).map(([day, templates]) => (
                <DayGroup
                  key={day}
                  day={day as "SATURDAY" | "SUNDAY"}
                  templates={templates}
                  classes={classes}
                  isExpanded={expandedDays.has(`chapel-${day}`)}
                  onToggle={() => toggleDay(`chapel-${day}`)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Course-based CLASS Sessions - Commented out for chapel-only mode
        {courses.map((course) => {
          const courseData = groupedData[course.id];
          if (!courseData) return null;

          const totalSessions = Object.values(courseData).flatMap((classData) =>
            Object.values(classData).flat()
          ).length;

          return (
            <Card key={course.id} className="border">
              <CardHeader className="pb-3">
                <Button
                  variant="ghost"
                  onClick={() => toggleCourse(course.id)}
                  className="flex items-center gap-2 h-auto p-0 hover:bg-transparent w-full justify-start"
                >
                  {expandedCourses.has(course.id) ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <Badge variant="default" className="text-sm">
                    {course.name}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {totalSessions} session{totalSessions !== 1 ? "s" : ""}
                  </span>
                </Button>
              </CardHeader>

              {expandedCourses.has(course.id) && (
                <CardContent className="pt-0 space-y-4">
                  {Object.entries(courseData).map(([classId, classData]) => {
                    const cls = classes.find((c) => c.id === classId);
                    const classSessions = Object.values(classData).flat();

                    return (
                      <div key={classId} className="border-l-2 border-primary/20 pl-4">
                        <Button
                          variant="ghost"
                          onClick={() => toggleClass(classId)}
                          className="flex items-center gap-2 h-auto p-0 hover:bg-transparent mb-2"
                        >
                          {expandedClasses.has(classId) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">Class {cls?.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({classSessions.length} session{classSessions.length !== 1 ? "s" : ""})
                          </span>
                        </Button>

                        {expandedClasses.has(classId) && (
                          <div className="space-y-3 ml-6">
                            {Object.entries(classData).map(([day, templates]) => (
                              <DayGroup
                                key={day}
                                day={day as "SATURDAY" | "SUNDAY"}
                                templates={templates}
                                classes={classes}
                                isExpanded={expandedDays.has(`${classId}-${day}`)}
                                onToggle={() => toggleDay(`${classId}-${day}`)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
        */}

        {/* Unassigned CLASS Sessions - Commented out for chapel-only mode
        {groupedData["unassigned"] && (
          <Card className="border-2 border-destructive/50">
            <CardHeader className="pb-3 bg-destructive/10">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-sm">
                  UNASSIGNED CLASSES
                </Badge>
                <span className="text-sm text-muted-foreground">
                  No class assigned
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {Object.entries(groupedData["unassigned"]["unassigned"]).map(([day, templates]) => (
                <DayGroup
                  key={day}
                  day={day as "SATURDAY" | "SUNDAY"}
                  templates={templates}
                  classes={classes}
                  isExpanded={expandedDays.has(`unassigned-${day}`)}
                  onToggle={() => toggleDay(`unassigned-${day}`)}
                />
              ))}
            </CardContent>
          </Card>
        )}
        */}
      </CardContent>
    </Card>
  );
}

function DayGroup({
  day,
  templates,
  classes,
  isExpanded,
  onToggle,
}: {
  day: "SATURDAY" | "SUNDAY";
  templates: Array<Session & { weekendCount: number }>;
  classes: Class[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border rounded-lg p-3 bg-accent/20">
      <Button
        variant="ghost"
        onClick={onToggle}
        className="flex items-center gap-2 h-auto p-0 hover:bg-transparent mb-2"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Badge variant="outline" className="text-xs">
          {day}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {templates.length} session{templates.length !== 1 ? "s" : ""}
        </span>
      </Button>

      {isExpanded && (
        <div className="space-y-2 ml-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-3 bg-background space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium">{template.name}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    {template.startTime} - {template.endTime}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Applied to {template.weekendCount} weekend{template.weekendCount !== 1 ? "s" : ""}
                  </div>
                </div>
                <DeleteSessionButton
                  sessionId={template.id}
                  sessionName={template.name}
                />
              </div>

              {template.sessionType === "CLASS" && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Assigned Classes:</div>
                  <ManageSessionClasses
                    sessionId={template.id}
                    sessionClasses={template.sessionClasses}
                    allClasses={classes}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
