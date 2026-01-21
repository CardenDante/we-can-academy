# Flexible Attendance Model - Updated Architecture

## Overview

The system has been updated to support **flexible class attendance**, where students are enrolled in courses but NOT locked to specific classes. This allows students to attend any class session within their course.

---

## Key Concept

### Old Model (Rigid):
```
Student → Assigned to ONE specific class → Can only attend that class
```

### New Model (Flexible):
```
Student → Enrolled in COURSE → Can attend ANY class session in that course
```

---

## Example Scenario

**Course: Programming**
- **Class A** - Morning Session (8am-10am) - Teacher: John
- **Class B** - Afternoon Session (2pm-4pm) - Teacher: Sarah
- **Class C** - Evening Session (6pm-8pm) - Teacher: Mike

**Student: Alice** (Enrolled in Programming Course)
- Monday: Attends Programming Class B (2pm-4pm)
- Tuesday: Attends Programming Class A (8am-10am)
- Wednesday: Attends Programming Class C (6pm-8pm)

Alice is NOT locked to one class - she can attend whichever session fits her schedule!

---

## Database Structure

### Student Model (Simplified)
```prisma
model Student {
  id              String       @id
  admissionNumber String       @unique
  fullName        String
  courseId        String       // Only linked to COURSE, not class
  course          Course       @relation(fields: [courseId], references: [id])
  // NO classId field - students are not locked to classes
  attendances     Attendance[]
}
```

### Teacher Model
```prisma
model Teacher {
  id      String  @id
  userId  String  @unique
  user    User    @relation(fields: [userId], references: [id])
  classId String  // Teachers ARE assigned to specific classes
  class   Class   @relation(fields: [classId], references: [id])
}
```

### Class Model
```prisma
model Class {
  id             String          @id
  name           String
  courseId       String
  course         Course          @relation(fields: [courseId], references: [id])
  teachers       Teacher[]       // Teachers assigned to this class
  sessionClasses SessionClass[]  // Sessions scheduled for this class
  attendances    Attendance[]    // Attendance records for this class
  // NO students[] relation - students are not assigned to classes
}
```

### Attendance Model
```prisma
model Attendance {
  id        String   @id
  studentId String
  student   Student  @relation(fields: [studentId], references: [id])
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id])
  classId   String   // Which class session they attended
  class     Class    @relation(fields: [classId], references: [id])
  markedAt  DateTime @default(now())
  markedBy  String
}
```

---

## How It Works

### 1. Student Registration
- Student registers for a **COURSE** (e.g., Programming)
- Student is NOT assigned to any specific class
- Student can attend ANY class in their course

### 2. Teacher Assignment
- Teacher is assigned to a specific **CLASS** (e.g., Programming - Class B)
- Teacher creates sessions for their class
- Teacher marks attendance for students who attend their sessions

### 3. Session Creation
- Admin creates sessions for specific classes
- Example: "Programming Class B - Morning Session 8am-10am"
- The session is linked to the class via `SessionClass` join table

### 4. Attendance Marking
- Student shows up to ANY class session in their course
- Teacher scans student's admission number
- System verifies:
  ✅ Student is enrolled in the course (Programming)
  ✅ Teacher owns this class session (Class B)
  ✅ Student hasn't already been marked for this session
- Attendance is recorded with the **classId** of the session attended

### 5. Teacher Dashboard
- Teachers see ALL students in their **COURSE**
- Example: Teacher of "Programming Class B" sees all Programming students
- When marking attendance, they can mark any Programming student who attends
- Students' attendance history shows which class sessions they attended

---

## Benefits

### For Students:
- ✅ Flexibility to attend different class times
- ✅ Can switch between morning/afternoon/evening sessions
- ✅ Not locked to one teacher or time slot
- ✅ Can attend based on their schedule

### For Teachers:
- ✅ Can mark any course student who attends their session
- ✅ See all potential students in the course
- ✅ Track which students attend their specific class
- ✅ No restrictions on who can attend

### For Administration:
- ✅ Better resource utilization
- ✅ Accommodate student schedule conflicts
- ✅ Track actual attendance patterns
- ✅ Flexible session scheduling

---

## Permission Model

### Students
- **Can** attend any class session in their enrolled course
- **Cannot** attend classes from different courses

### Teachers
- **Can** view all students in their course
- **Can** mark attendance for any student in their course who attends their session
- **Can** only mark attendance for sessions assigned to their class
- **Cannot** mark attendance for other courses

### Staff
- **Can** mark chapel attendance for all students
- **Can** check in students at the gate
- **Not** involved in class session attendance

### Admin
- **Can** create courses and classes
- **Can** assign teachers to classes
- **Can** create sessions for classes
- **Can** view all attendance records

---

## API Changes

### Mobile API - Students Endpoint

**GET /api/mobile/students**
- **Teachers**: Returns all students in teacher's COURSE (not just their class)
- **Staff**: Returns all students

**POST /api/mobile/students** (Get by admission number)
- **Teachers**: Verifies student is in teacher's COURSE
- **Staff**: No restrictions

### Mobile API - Attendance Endpoint

**POST /api/mobile/attendance** (Mark attendance)
- **Teachers**:
  - Verifies student is in teacher's course ✅
  - Verifies session belongs to teacher's class ✅
  - Automatically sets `classId` to teacher's class
  - Any course student can be marked if they attend
- **Staff**:
  - Used for chapel attendance only
  - All students can be marked

---

## Migration

### Database Migration

**File**: `prisma/migrations/20260122000001_remove_student_class_assignment/migration.sql`

```sql
-- Remove classId from Student table
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_classId_fkey";
DROP INDEX IF EXISTS "Student_classId_idx";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "classId";
```

**To Apply**:
```bash
cd reg-system
npx prisma migrate deploy
npx prisma generate
```

### Code Changes

1. ✅ Removed `classId` from Student model
2. ✅ Updated teacher actions to query by courseId
3. ✅ Updated teacher dashboards to show course students
4. ✅ Updated mobile API to filter by course
5. ✅ Attendance logic already supports flexible model

---

## Examples

### Example 1: Programming Course

**Course**: Programming
**Classes**:
- Class A (Morning 8am-10am) - Teacher John
- Class B (Afternoon 2pm-4pm) - Teacher Sarah

**Students**:
- Alice (Programming student)
- Bob (Programming student)
- Carol (Programming student)

**Monday**:
- Alice attends Class A → Marked by John → Attendance recorded for "Class A"
- Bob attends Class B → Marked by Sarah → Attendance recorded for "Class B"

**Tuesday**:
- Alice attends Class B → Marked by Sarah → Attendance recorded for "Class B"
- Bob attends Class A → Marked by John → Attendance recorded for "Class A"
- Carol attends Class A → Marked by John → Attendance recorded for "Class A"

**Result**:
- Alice's attendance: Class A (Monday), Class B (Tuesday)
- Bob's attendance: Class B (Monday), Class A (Tuesday)
- Carol's attendance: Class A (Tuesday)

All students are flexible and can attend any session!

### Example 2: Teacher Dashboard

**Teacher**: John (Programming Class A)

**Dashboard Shows**:
- Total Course Students: 50 (all Programming students)
- Can mark attendance for: Any of the 50 students who attend Class A
- Attendance History: Shows which students attended Class A sessions

**Marking Attendance**:
1. Alice (Programming student) attends Class A
2. John scans Alice's admission number
3. System verifies Alice is a Programming student ✅
4. System verifies this is a Class A session (John's class) ✅
5. Attendance marked for Alice in Class A ✅

### Example 3: Mobile App

**Teacher App - John (Programming Class A)**:

```javascript
// 1. Login
const { token } = await login('teacher.john', 'password');

// 2. Get students
const { students } = await getStudents(token);
// Returns: All 50 Programming students (not just Class A)

// 3. Get sessions
const { sessions } = await getSessions(token);
// Returns: Only Class A sessions (John's class)

// 4. Mark attendance
const session = sessions[0]; // Class A Morning Session
const student = students.find(s => s.admissionNumber === '2024001');

await markAttendance(token, {
  studentId: student.id,
  sessionId: session.id
  // classId is automatically set to John's class (Class A)
});
// ✅ Success - Alice marked present in Class A
```

---

## Testing Checklist

- [ ] Students can be registered without assigning to class
- [ ] Teachers can view all students in their course
- [ ] Teachers can mark any course student who attends their session
- [ ] Teachers cannot mark students from other courses
- [ ] Attendance records show which class session was attended
- [ ] Mobile API returns course students for teachers
- [ ] Mobile API allows marking any course student
- [ ] Student detail page shows attendance across all classes

---

## Important Notes

1. **Students are NOT locked to classes** - They're enrolled in courses only
2. **Teachers ARE locked to classes** - They teach specific class sessions
3. **Attendance tracks which class** - Each attendance record includes classId
4. **Flexibility for students** - Can attend any session in their course
5. **Control for teachers** - Can only mark attendance for their sessions

---

## Future Enhancements

1. **Attendance Limits**: Optional limit on which classes a student can attend
2. **Class Capacity**: Maximum students per class session
3. **Preferred Class**: Students can set a preferred class (but not locked)
4. **Attendance Analytics**: Track which classes are most popular
5. **Smart Scheduling**: Suggest classes based on student attendance patterns

---

**Implementation Date**: January 22, 2026
**Version**: 2.0.0 (Flexible Attendance Model)
**Status**: ✅ Complete
