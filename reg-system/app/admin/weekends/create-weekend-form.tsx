"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createWeekend, generateWeekends } from "@/app/actions/academy";

export function CreateWeekendForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [generateProgram, setGenerateProgram] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const saturdayDate = new Date(formData.get("saturdayDate") as string);
    const name = formData.get("name") as string;

    try {
      if (generateProgram) {
        // Generate 12 weeks automatically
        await generateWeekends({ startDate: saturdayDate, startName: name });
        setSuccess("12-week program generated successfully!");
      } else {
        // Create single weekend
        await createWeekend({ saturdayDate, name });
        setSuccess("Weekend created successfully!");
      }
      setFormKey(prev => prev + 1);
      setGenerateProgram(false);
    } catch (err: any) {
      setError(err.message || "Failed to create weekend");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Weekend Name</Label>
        <Input id="name" name="name" placeholder="e.g. Weekend 1" required />
      </div>
      <div>
        <Label htmlFor="saturdayDate">Saturday Date</Label>
        <Input id="saturdayDate" name="saturdayDate" type="date" required />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="generateProgram"
          checked={generateProgram}
          onCheckedChange={(checked) => setGenerateProgram(checked as boolean)}
        />
        <Label
          htmlFor="generateProgram"
          className="text-sm font-normal cursor-pointer"
        >
          Generate 12-week program automatically
        </Label>
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
        {loading ? "Creating..." : generateProgram ? "Generate 12 Weeks" : "Create Weekend"}
      </Button>
    </form>
  );
}
