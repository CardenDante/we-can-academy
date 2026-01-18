"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { expelStudent, reinstateStudent } from "@/app/actions/students";
import { ProfilePictureDisplay } from "@/components/profile-picture";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Loader2,
  UserX,
  UserCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Student = {
  id: string;
  admissionNumber: string;
  fullName: string;
  gender: "MALE" | "FEMALE";
  course: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
  areaOfResidence: string;
  phoneNumber: string;
  identification: string;
  profilePicture: string | null;
  isExpelled: boolean;
  expelledAt: Date | null;
  expelledReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  courseId: string;
};

export function StudentsClient({ students: initialStudents }: { students: Student[] }) {
  const router = useRouter();
  const [students, setStudents] = useState(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Expel dialog state
  const [expelDialogOpen, setExpelDialogOpen] = useState(false);
  const [studentToExpel, setStudentToExpel] = useState<Student | null>(null);
  const [expelReason, setExpelReason] = useState("");

  // Reinstate dialog state
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [studentToReinstate, setStudentToReinstate] = useState<Student | null>(null);

  // Filter students based on search
  const filteredStudents = students.filter((student) => {
    const term = searchTerm.toLowerCase();
    return (
      student.fullName.toLowerCase().includes(term) ||
      student.admissionNumber.toLowerCase().includes(term) ||
      student.course.name.toLowerCase().includes(term)
    );
  });

  // Handle expel
  const handleExpel = async () => {
    if (!studentToExpel || !expelReason.trim()) return;

    setLoading(studentToExpel.id);
    setError(null);

    try {
      await expelStudent(studentToExpel.id, expelReason);
      setStudents(students.map(s =>
        s.id === studentToExpel.id
          ? { ...s, isExpelled: true, expelledAt: new Date(), expelledReason: expelReason }
          : s
      ));
      setExpelDialogOpen(false);
      setStudentToExpel(null);
      setExpelReason("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to expel student");
    } finally {
      setLoading(null);
    }
  };

  // Handle reinstate
  const handleReinstate = async () => {
    if (!studentToReinstate) return;

    setLoading(studentToReinstate.id);
    setError(null);

    try {
      await reinstateStudent(studentToReinstate.id);
      setStudents(students.map(s =>
        s.id === studentToReinstate.id
          ? { ...s, isExpelled: false, expelledAt: null, expelledReason: null }
          : s
      ));
      setReinstateDialogOpen(false);
      setStudentToReinstate(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to reinstate student");
    } finally {
      setLoading(null);
    }
  };


  const expelledCount = students.filter(s => s.isExpelled).length;
  const activeCount = students.filter(s => !s.isExpelled).length;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="luxury-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Students</p>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="luxury-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expelled Students</p>
                <p className="text-2xl font-bold text-red-600">{expelledCount}</p>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      <Card className="luxury-card border-0">
        <CardHeader className="pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base sm:text-lg font-medium tracking-tight uppercase">All Students</CardTitle>
              <CardDescription className="text-sm font-light">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
                {searchTerm ? " found" : " registered"}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 sm:pl-4">Student</TableHead>
                  <TableHead className="hidden sm:table-cell">Admission #</TableHead>
                  <TableHead className="hidden md:table-cell">Course</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-4 sm:pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id} className={student.isExpelled ? "bg-red-500/5" : ""}>
                    <TableCell className="pl-4 sm:pl-4">
                      <div className="flex items-center gap-3">
                        <ProfilePictureDisplay
                          profilePictureUrl={student.profilePicture}
                          gender={student.gender}
                          size="sm"
                        />
                        <div>
                          <div className={`font-medium ${student.isExpelled ? "text-red-600" : ""}`}>
                            {student.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            {student.admissionNumber}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm hidden sm:table-cell">
                      {student.admissionNumber}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{student.course.name}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {student.phoneNumber}
                    </TableCell>
                    <TableCell>
                      {student.isExpelled ? (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Expelled
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                          <ShieldCheck className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4 sm:pr-4">
                      <div className="flex items-center justify-end gap-2">
                        {student.isExpelled ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading === student.id}
                            onClick={() => {
                              setStudentToReinstate(student);
                              setReinstateDialogOpen(true);
                            }}
                          >
                            {loading === student.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Reinstate"
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading === student.id}
                            onClick={() => {
                              setStudentToExpel(student);
                              setExpelDialogOpen(true);
                            }}
                          >
                            {loading === student.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Expel"
                            )}
                          </Button>
                        )}
                        <Link href={`/admin/students/${student.id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      {searchTerm ? "No students match your search" : "No students registered yet"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Expel Dialog */}
      <Dialog open={expelDialogOpen} onOpenChange={setExpelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              Expel Student
            </DialogTitle>
            <DialogDescription>
              This will prevent {studentToExpel?.fullName} from checking in at the security gate.
              They will not be able to attend any sessions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {studentToExpel && (
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <ProfilePictureDisplay
                  profilePictureUrl={studentToExpel.profilePicture}
                  gender={studentToExpel.gender}
                  size="md"
                />
                <div>
                  <p className="font-medium">{studentToExpel.fullName}</p>
                  <p className="text-sm text-muted-foreground">{studentToExpel.admissionNumber}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Expulsion *</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for expelling this student..."
                value={expelReason}
                onChange={(e) => setExpelReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be shown to security when the student tries to check in.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpelDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleExpel}
              disabled={!expelReason.trim() || loading === studentToExpel?.id}
            >
              {loading === studentToExpel?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShieldAlert className="h-4 w-4 mr-2" />
              )}
              Expel Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reinstate Dialog */}
      <AlertDialog open={reinstateDialogOpen} onOpenChange={setReinstateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="h-5 w-5" />
              Reinstate Student
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reinstate {studentToReinstate?.fullName}?
              They will be able to check in at the security gate and attend sessions again.
              {studentToReinstate?.expelledReason && (
                <span className="block mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Previous expulsion reason:</strong> {studentToReinstate.expelledReason}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={handleReinstate}
              disabled={loading === studentToReinstate?.id}
            >
              {loading === studentToReinstate?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Reinstate Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
