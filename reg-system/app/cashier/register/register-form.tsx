"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { getCourses } from "@/app/actions/academy";
import { registerStudent } from "@/app/actions/students";

export function RegisterStudentForm() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get("fullName") as string,
      gender: formData.get("gender") as "MALE" | "FEMALE",
      courseId: formData.get("courseId") as string,
      areaOfResidence: formData.get("areaOfResidence") as string,
      phoneNumber: formData.get("phoneNumber") as string,
      identification: formData.get("identification") as string,
      admissionNumber: formData.get("admissionNumber") as string,
    };

    try {
      await registerStudent(data);
      setSuccess("Student registered successfully!");
      e.currentTarget.reset();
      setTimeout(() => {
        router.push("/cashier/students");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to register student");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admissionNumber">Receipt Number (Admission #) *</Label>
              <Input
                id="admissionNumber"
                name="admissionNumber"
                placeholder="Enter receipt/admission number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select name="gender" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseId">Course *</Label>
              <Select name="courseId" required>
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
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                placeholder="Enter phone number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identification">Identification (ID/Passport) *</Label>
              <Input
                id="identification"
                name="identification"
                placeholder="Enter ID or passport number"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="areaOfResidence">Area of Residence *</Label>
            <Input
              id="areaOfResidence"
              name="areaOfResidence"
              placeholder="Enter area of residence"
              required
            />
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
            {loading ? "Registering..." : "Register Student"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
