"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClass } from "@/app/actions/academy";

type Course = {
  id: string;
  name: string;
};

export function CreateClassForm({ courses }: { courses: Course[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      courseId: selectedCourse,
    };

    if (!data.courseId) {
      setError("Please select a course");
      setLoading(false);
      return;
    }

    try {
      await createClass(data);
      setSuccess("Class created successfully!");
      setSelectedCourse("");
      setFormKey(prev => prev + 1);
    } catch (err: any) {
      setError(err.message || "Failed to create class");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Class Name</Label>
        <Input id="name" name="name" placeholder="e.g. A, B, C" required />
      </div>
      <div>
        <Label htmlFor="course">Course</Label>
        <Select value={selectedCourse} onValueChange={setSelectedCourse} required>
          <SelectTrigger>
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        {loading ? "Creating..." : "Create Class"}
      </Button>
    </form>
  );
}
