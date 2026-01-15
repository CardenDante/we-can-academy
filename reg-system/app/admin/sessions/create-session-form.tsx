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

export function CreateSessionForm({ weekends }: { weekends: Weekend[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedWeekend, setSelectedWeekend] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const data = {
      weekendId: selectedWeekend,
      day: selectedDay as "SATURDAY" | "SUNDAY",
      sessionType: selectedType as "CLASS" | "CHAPEL",
      name: formData.get("name") as string,
      startTime: formData.get("startTime") as string,
      endTime: formData.get("endTime") as string,
    };

    if (!data.weekendId || !data.day || !data.sessionType) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      await createSession(data);
      setSuccess("Session created successfully!");
      setSelectedWeekend("");
      setSelectedDay("");
      setSelectedType("");
      setFormKey(prev => prev + 1);
    } catch (err: any) {
      setError(err.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="weekend">Weekend</Label>
        <Select value={selectedWeekend} onValueChange={setSelectedWeekend} required>
          <SelectTrigger>
            <SelectValue placeholder="Select weekend" />
          </SelectTrigger>
          <SelectContent>
            {weekends.map((weekend) => (
              <SelectItem key={weekend.id} value={weekend.id}>
                {weekend.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Label htmlFor="sessionType">Session Type</Label>
        <Select value={selectedType} onValueChange={setSelectedType} required>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CLASS">Class</SelectItem>
            <SelectItem value="CHAPEL">Chapel</SelectItem>
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
