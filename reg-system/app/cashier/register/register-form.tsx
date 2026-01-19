"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCourses } from "@/app/actions/academy";
import { registerStudent, getStudentByAdmission } from "@/app/actions/students";
import { ProfilePictureUpload, uploadProfilePicture, ProfilePictureDisplay } from "@/components/profile-picture";
import {
  User,
  Hash,
  CreditCard,
  Phone,
  MapPin,
  BookOpen,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Camera,
  ScanBarcode,
  Search
} from "lucide-react";

export function RegisterStudentForm() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedGender, setSelectedGender] = useState<"MALE" | "FEMALE" | "">("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  // Test scanner state
  const [scanInput, setScanInput] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<any>(null);
  const [scanError, setScanError] = useState("");

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
      churchDistrict: selectedDistrict,
    };

    if (!data.gender || !data.courseId || !data.churchDistrict) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    const result = await registerStudent(data);

    if (!result.success) {
      setError(result.error || "Failed to register student");
      setLoading(false);
      return;
    }

    // Upload profile picture if provided
    if (profileImageFile && result.student?.id) {
      try {
        await uploadProfilePicture(result.student.id, profileImageFile);
      } catch (uploadErr: any) {
        console.error("Profile picture upload failed:", uploadErr);
        // Don't fail the whole registration if picture upload fails
        setError(`Student registered, but profile picture upload failed: ${uploadErr.message}`);
        setLoading(false);
        return;
      }
    }

    setSuccess("Student registered successfully!");
    setSelectedGender("");
    setSelectedCourse("");
    setSelectedDistrict("");
    setProfileImage(null);
    setProfileImageFile(null);
    setFormKey(prev => prev + 1);
    setTimeout(() => setSuccess(""), 3000);
    setLoading(false);
  }

  async function handleScan() {
    if (!scanInput.trim()) {
      setScanError("Please enter an admission number");
      return;
    }

    setScanLoading(true);
    setScanError("");
    setScannedStudent(null);

    try {
      const student = await getStudentByAdmission(scanInput.trim());
      if (!student) {
        setScanError("No student found with this admission number");
      } else {
        setScannedStudent(student);
      }
    } catch (err: any) {
      setScanError(err.message || "Failed to fetch student data");
    } finally {
      setScanLoading(false);
    }
  }

  return (
    <div className="w-full flex gap-6 max-w-7xl mx-auto">
      {/* Registration Form */}
      <Card className="flex-1 border border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
              <CardTitle className="text-base font-medium tracking-tight uppercase">Register New Student</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Enter the student's personal and academic details below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      
      <CardContent className="px-8 py-8">
        <form key={formKey} onSubmit={handleSubmit} className="space-y-8">

          {/* Section 0: Profile Picture (Optional) */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-3 h-3" /> Profile Picture (Optional)
            </h3>
            <div className="flex justify-center py-4">
              <ProfilePictureUpload
                onImageCapture={(imageData, file) => {
                  setProfileImage(imageData);
                  setProfileImageFile(file || null);
                }}
                initialImage={profileImage}
                gender={selectedGender}
              />
            </div>
          </div>

          <div className="h-[1px] bg-border/40 w-full" />

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
                  <Input id="fullName" name="fullName" placeholder=" e.g. Daniel Chacha" className="pl-9" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={selectedGender} onValueChange={(v) => setSelectedGender(v as "MALE" | "FEMALE")} required>
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
                  <Input id="identification" name="identification" placeholder="ID Number/Passport" className="pl-9" required />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="areaOfResidence">Area of Residence</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="areaOfResidence" name="areaOfResidence" placeholder="e.g. Githurai 44" className="pl-9" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="churchDistrict">Church District</Label>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict} required>
                <SelectTrigger className="pl-3">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="Ruaraka">Ruaraka</SelectItem>
                  <SelectItem value="Roysambu">Roysambu</SelectItem>
                  <SelectItem value="Mwiki">Mwiki</SelectItem>
                  <SelectItem value="Embakasi">Embakasi</SelectItem>
                  <SelectItem value="Githurai 44">Githurai 44</SelectItem>
                  <SelectItem value="Githurai 45">Githurai 45</SelectItem>
                  <SelectItem value="Huruma">Huruma</SelectItem>
                  <SelectItem value="Mathare">Mathare</SelectItem>
                  <SelectItem value="Kasarani">Kasarani</SelectItem>
                  <SelectItem value="Starehe">Starehe</SelectItem>
                  <SelectItem value="CBD">CBD</SelectItem>
                  <SelectItem value="Church">Church</SelectItem>
                </SelectContent>
              </Select>
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
                  <Input id="admissionNumber" name="admissionNumber" placeholder="eg. 5326" className="pl-9" required />
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
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 text-sm rounded flex items-center gap-2">
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

      {/* Test Scanner Panel */}
      <Card className="w-80 border border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-fit">
        <CardHeader className="space-y-1 border-b border-border/40 px-6 py-4 bg-muted/20">
          <CardTitle className="text-sm font-medium tracking-tight uppercase flex items-center gap-2">
            <ScanBarcode className="w-4 h-4" />
            Test Scanner
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Input or scan admission number to test data
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 py-6 space-y-4">
          {/* Scan Input */}
          <div className="space-y-2">
            <Label htmlFor="scanInput" className="text-xs">Admission Number</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="scanInput"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  placeholder="e.g. 5326"
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                size="icon"
                onClick={handleScan}
                disabled={scanLoading}
              >
                {scanLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Scan Error */}
          {scanError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
              {scanError}
            </div>
          )}

          {/* Scanned Student Profile */}
          {scannedStudent && (
            <div className="space-y-4 pt-2">
              <div className="h-[1px] bg-border/40 w-full" />

              {/* Profile Picture */}
              <div className="flex justify-center">
                <ProfilePictureDisplay
                  profilePictureUrl={scannedStudent.profilePicture}
                  gender={scannedStudent.gender}
                  size="lg"
                />
              </div>

              {/* Student Info */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{scannedStudent.fullName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Adm:</span>
                  <span>{scannedStudent.admissionNumber}</span>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Course:</span>
                  <span className="text-xs">{scannedStudent.course?.name || "N/A"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{scannedStudent.phoneNumber}</span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Area:</span>
                  <span>{scannedStudent.areaOfResidence}</span>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">District:</span>
                  <span className="text-xs">{scannedStudent.churchDistrict || "N/A"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">ID:</span>
                  <span>{scannedStudent.identification}</span>
                </div>
              </div>

              {/* Clear Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  setScannedStudent(null);
                  setScanInput("");
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}