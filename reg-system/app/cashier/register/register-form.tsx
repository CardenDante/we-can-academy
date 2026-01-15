"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCourses } from "@/app/actions/academy";
import { registerStudent } from "@/app/actions/students";
import { 
  User, 
  Hash, 
  CreditCard, 
  Phone, 
  MapPin, 
  BookOpen, 
  Loader2,
  CheckCircle2,
  ArrowLeft 
} from "lucide-react";

export function RegisterStudentForm() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [formKey, setFormKey] = useState(0);

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
      gender: selectedGender as "MALE" | "FEMALE",
      courseId: selectedCourse,
      areaOfResidence: formData.get("areaOfResidence") as string,
      phoneNumber: formData.get("phoneNumber") as string,
      identification: formData.get("identification") as string,
      admissionNumber: formData.get("admissionNumber") as string,
    };

    if (!data.gender || !data.courseId) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      await registerStudent(data);
      setSuccess("Student registered successfully!");
      setSelectedGender("");
      setSelectedCourse("");
      setFormKey(prev => prev + 1);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to register student");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-3xl border border-border/50 shadow-xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader className="space-y-1 border-b border-border/40 px-8 py-6 bg-muted/20">
        
        {/* Back Button */}
        <div className="mb-2">
            <Button 
                variant="ghost" 
                size="sm" 
                className="-ml-3 h-8 text-muted-foreground hover:text-foreground"
                onClick={() => router.back()}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Register New Student</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Enter the student's personal and academic details below.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-8 py-8">
        <form key={formKey} onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="w-3 h-3" /> Personal Information
            </h3>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="fullName" name="fullName" placeholder="John Doe" className="pl-9" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={selectedGender} onValueChange={setSelectedGender} required>
                  <SelectTrigger className="pl-3">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="phoneNumber" name="phoneNumber" type="tel" placeholder="0700 000 000" className="pl-9" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="identification">ID / Passport</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="identification" name="identification" placeholder="ID Number" className="pl-9" required />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="areaOfResidence">Area of Residence</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="areaOfResidence" name="areaOfResidence" placeholder="e.g. Westlands, Nairobi" className="pl-9" required />
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-border/40 w-full" />

          {/* Section 2: Academic Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Academic Information
            </h3>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admissionNumber">Receipt / Admission #</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="admissionNumber" name="admissionNumber" placeholder="REC-001" className="pl-9" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseId">Selected Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  
                  {/* FIX APPLIED HERE: max-h-[300px] allows scrolling */}
                  <SelectContent className="max-h-[300px]">
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 text-sm rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto min-w-[150px] font-medium transition-all">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}