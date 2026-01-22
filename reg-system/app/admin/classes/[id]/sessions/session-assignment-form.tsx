"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignSessionToClass } from "@/app/actions/sessions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Weekend {
  id: string;
  saturdayDate: Date;
  sessions: {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    sessionType: string;
  }[];
}

interface SessionAssignmentFormProps {
  classId: string;
  className: string;
  weekends: Weekend[];
}

export function SessionAssignmentForm({
  classId,
  className,
  weekends,
}: SessionAssignmentFormProps) {
  const router = useRouter();
  const [selectedWeekend, setSelectedWeekend] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedWeekendData = weekends.find((w) => w.id === selectedWeekend);
  const availableSessions = selectedWeekendData?.sessions || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedSession) {
      setError("Please select a session");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await assignSessionToClass({
        sessionId: selectedSession,
        classId,
      });

      if (result.success) {
        setSelectedWeekend("");
        setSelectedSession("");
        router.refresh();
      } else {
        setError(result.error || "Failed to assign session");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="weekend">Select Weekend</Label>
        <Select value={selectedWeekend} onValueChange={setSelectedWeekend}>
          <SelectTrigger id="weekend">
            <SelectValue placeholder="Choose a weekend" />
          </SelectTrigger>
          <SelectContent>
            {weekends.map((weekend) => (
              <SelectItem key={weekend.id} value={weekend.id}>
                {new Date(weekend.saturdayDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {weekend.sessions.length === 0 && " (No sessions)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedWeekend && (
        <div className="space-y-2">
          <Label htmlFor="session">Select Session</Label>
          <Select
            value={selectedSession}
            onValueChange={setSelectedSession}
            disabled={availableSessions.length === 0}
          >
            <SelectTrigger id="session">
              <SelectValue placeholder="Choose a session" />
            </SelectTrigger>
            <SelectContent>
              {availableSessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.day} - {session.startTime} to {session.endTime}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableSessions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No class sessions available for this weekend
            </p>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !selectedSession}
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Assign Session to {className}
      </Button>
    </form>
  );
}
