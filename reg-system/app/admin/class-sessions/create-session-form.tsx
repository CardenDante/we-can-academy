"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSession } from "@/app/actions/academy";

type Weekend = {
  id: string;
  name: string;
  saturdayDate: Date;
};

interface CreateSessionFormProps {
  weekends: Weekend[];
  sessionType?: "CLASS" | "CHAPEL";
}

export function CreateSessionForm({ weekends, sessionType = "CHAPEL" }: CreateSessionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const data = {
      day: selectedDay as "SATURDAY" | "SUNDAY",
      sessionType: sessionType,
      name: formData.get("name") as string,
      startTime: formData.get("startTime") as string,
      endTime: formData.get("endTime") as string,
    };

    if (!data.day) {
      setError("Please select a day");
      setLoading(false);
      return;
    }

    try {
      await createSession(data);
      const typeLabel = sessionType === "CLASS" ? "Class" : "Chapel";
      setSuccess(`${typeLabel} session created for all ${weekends.length} weekends!`);
      setSelectedDay("");
      setFormKey(prev => prev + 1);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  const typeLabel = sessionType === "CLASS" ? "class" : "chapel";

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm rounded-md">
        This {typeLabel} session will be created for all {weekends.length} weekends automatically
      </div>

      <div>
        <Label htmlFor="day">Day</Label>
        <Select value={selectedDay} onValueChange={setSelectedDay} required>
          <SelectTrigger>
            <SelectValue placeholder="Select day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SATURDAY">Saturday</SelectItem>
            <SelectItem value="SUNDAY">Sunday</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="name">Session Name</Label>
        <Input id="name" name="name" placeholder="e.g. Morning Session" required />
      </div>
      <div>
        <Label htmlFor="startTime">Start Time</Label>
        <Input id="startTime" name="startTime" type="time" required />
      </div>
      <div>
        <Label htmlFor="endTime">End Time</Label>
        <Input id="endTime" name="endTime" type="time" required />
      </div>
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/10 text-green-600 text-sm rounded-md">
          {success}
        </div>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Session"}
      </Button>
    </form>
  );
}
