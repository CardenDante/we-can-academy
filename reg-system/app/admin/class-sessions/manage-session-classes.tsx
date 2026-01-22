"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { assignClassToSession, removeClassFromSession } from "@/app/actions/academy";

type SessionClass = {
  id: string;
  class: {
    id: string;
    name: string;
    course: {
      name: string;
    };
  };
};

type Class = {
  id: string;
  name: string;
  course: {
    name: string;
  };
};

export function ManageSessionClasses({
  sessionId,
  sessionClasses,
  allClasses,
}: {
  sessionId: string;
  sessionClasses: SessionClass[];
  allClasses: Class[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  const assignedClassIds = new Set(sessionClasses.map((sc) => sc.class.id));
  const availableClasses = allClasses.filter((c) => !assignedClassIds.has(c.id));

  async function handleAssign(classId: string) {
    setLoading(true);
    try {
      await assignClassToSession(sessionId, classId);
      setShowAdd(false);
    } catch (err: any) {
      alert(err.message || "Failed to assign class");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(classId: string) {
    setLoading(true);
    try {
      await removeClassFromSession(sessionId, classId);
    } catch (err: any) {
      alert(err.message || "Failed to remove class");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {sessionClasses.map((sc) => (
        <Badge key={sc.id} variant="default" className="gap-1">
          {sc.class.course.name} - {sc.class.name}
          <button
            onClick={() => handleRemove(sc.class.id)}
            disabled={loading}
            className="ml-1 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {!showAdd && availableClasses.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd(true)}
          className="h-6 px-2 text-xs"
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
      {showAdd && (
        <div className="flex flex-wrap gap-1">
          {availableClasses.map((cls) => (
            <Button
              key={cls.id}
              variant="secondary"
              size="sm"
              onClick={() => handleAssign(cls.id)}
              disabled={loading}
              className="h-6 px-2 text-xs"
            >
              {cls.course.name} - {cls.name}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdd(false)}
            className="h-6 px-2 text-xs"
          >
            Cancel
          </Button>
        </div>
      )}
      {sessionClasses.length === 0 && !showAdd && (
        <span className="text-muted-foreground text-sm">No classes</span>
      )}
    </div>
  );
}
