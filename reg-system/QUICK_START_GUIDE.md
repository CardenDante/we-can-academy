# Quick Start Guide - Teacher & Class Management

This guide will help you get started with the new Teacher role and Class Management features.

---

## Step 1: Deploy Database Changes

First, apply the database migration:

```bash
cd /home/chacha/we-can-academy/reg-system
npx prisma migrate deploy
npx prisma generate
```

This will:
- Add the TEACHER role to the system
- Create the Teacher table
- Add class relationships to students
- Update all necessary indexes

---

## Step 2: Create Course Structure

### 2.1 Create Courses (if not already done)

Log in as **ADMIN** and:
1. Go to Admin Dashboard → **Courses**
2. Create courses like:
   - Programming
   - Networking
   - Database Management
   - etc.

### 2.2 Create Classes

For each course, create classes:
1. Go to Admin Dashboard → **Courses & Classes**
2. Select a course
3. Create classes like:
   - Class A
   - Class B
   - Class C

Example:
- **Programming** → Class A, Class B, Class C
- **Networking** → Class A, Class B

---

## Step 3: Assign Students to Classes

### Option A: During Registration
When registering new students (Cashier role):
1. Fill in student information
2. Select **Course**
3. Select **Class** (dropdown will show classes for selected course)
4. Submit

### Option B: Bulk Assignment (Admin)
1. Go to Admin Dashboard → **Classes**
2. Select a class
3. Click "Assign Students"
4. Select students from the unassigned list
5. Submit

---

## Step 4: Create Teacher Accounts

### As Admin:
1. Go to Admin Dashboard → **Teachers**
2. Click "Add Teacher"
3. Fill in the form:
   - **Full Name**: Teacher's full name
   - **Username**: Login username (e.g., teacher.john)
   - **Password**: Minimum 6 characters
   - **Assign to Class**: Select the class they will teach
4. Click "Create Teacher"

Example:
```
Name: John Smith
Username: teacher.john
Password: secure123
Class: Programming - Class A
```

The teacher will now be able to:
- Log in to the system
- Access the teacher dashboard
- View only students in "Programming - Class A"
- Mark attendance for their class sessions

---

## Step 5: Create Class Sessions

### As Admin:
1. Go to Admin Dashboard → **Weekends**
2. Create a weekend (e.g., "Weekend 1" for Saturday, Jan 20, 2024)
3. Go to Admin Dashboard → **Sessions**
4. Create sessions:
   - **Weekend**: Select the weekend
   - **Day**: SATURDAY or SUNDAY
   - **Session Type**: CLASS (for class sessions) or CHAPEL (for chapel)
   - **Name**: e.g., "Session 1", "Morning Session"
   - **Start Time**: e.g., 09:00
   - **End Time**: e.g., 11:00
   - **Assign to Classes**: Select which classes this session is for

Example Class Session:
```
Weekend: Weekend 1
Day: SATURDAY
Type: CLASS
Name: Programming Session 1
Time: 09:00 - 11:00
Classes: Programming - Class A, Programming - Class B
```

---

## Step 6: Teacher Login and Usage

### Teacher Login:
1. Go to the login page
2. Enter username and password
3. You'll be redirected to the Teacher Dashboard

### Teacher Dashboard Features:

#### View Students
1. Click "My Students" card
2. See all students in your class
3. Click on any student to view their:
   - Profile information
   - Class attendance history
   - Chapel check-in history
   - Attendance statistics

#### Mark Attendance
1. Click "Mark Attendance" card
2. Select a session from the dropdown
   - Only sessions for YOUR class will appear
   - Current session is auto-selected if within time range
3. Scan or type student admission number
4. System verifies student is in your class
5. Click "Mark Present"
6. See real-time attendance list below

---

## Step 7: Mobile App Setup (Optional)

### For Mobile App Developers:

#### 1. Authentication
```javascript
const response = await fetch('https://your-domain.com/api/mobile/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'teacher.john',
    password: 'secure123'
  })
});

const { token, user } = await response.json();
// Store token securely for future requests
```

#### 2. Fetch Sessions (Teacher)
```javascript
const response = await fetch('https://your-domain.com/api/mobile/sessions', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { sessions } = await response.json();
// Only returns sessions for teacher's class
```

#### 3. Fetch Students (Teacher)
```javascript
const response = await fetch('https://your-domain.com/api/mobile/students', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { students } = await response.json();
// Only returns students in teacher's class
```

#### 4. Mark Attendance
```javascript
const response = await fetch('https://your-domain.com/api/mobile/attendance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    studentId: 'student_id_here',
    sessionId: 'session_id_here'
  })
});

const { attendance } = await response.json();
```

See [MOBILE_API_DOCUMENTATION.md](MOBILE_API_DOCUMENTATION.md) for complete API reference.

---

## Common Tasks

### Reassign a Teacher to Different Class
1. Admin Dashboard → **Teachers**
2. Find the teacher
3. Click edit/reassign
4. Select new class
5. Submit

### Add Students to Existing Class
1. Admin Dashboard → **Classes**
2. Select the class
3. Click "Assign Students"
4. Select students
5. Submit

### Create Multiple Teachers for Same Course
Create separate classes:
- Programming - Class A (Teacher: John)
- Programming - Class B (Teacher: Sarah)
- Programming - Class C (Teacher: Mike)

Each teacher will only see their assigned class.

### View Teacher's Performance
1. Admin Dashboard → **Teachers**
2. View student count per teacher
3. Click on a teacher to see details
4. Or go to **Analytics** to see attendance stats

---

## Troubleshooting

### Teacher Can't See Students
- ✅ Verify students are assigned to the correct class
- ✅ Check teacher is assigned to the correct class
- ✅ Ensure students are not expelled

### Teacher Can't Mark Attendance
- ✅ Verify session is assigned to teacher's class
- ✅ Check session type is CLASS (not CHAPEL)
- ✅ Ensure session time is correct
- ✅ Verify student is in teacher's class

### Mobile App Can't Login
- ✅ Verify user role is STAFF or TEACHER (not ADMIN, CASHIER, SECURITY)
- ✅ Check credentials are correct
- ✅ Ensure API endpoint URL is correct
- ✅ Check network connectivity

### Database Migration Issues
```bash
# Reset and reapply migration
npx prisma migrate reset  # WARNING: Deletes all data
npx prisma migrate deploy
npx prisma generate
```

Or manually run the SQL migration file.

---

## Security Notes

### Teacher Permissions
Teachers can ONLY:
- View students in their assigned class
- Mark attendance for their class sessions
- View attendance records for their class

Teachers CANNOT:
- Access other classes
- Modify student records
- Create or delete students
- Access admin functions
- Check in students at gate (STAFF only)

### Password Security
- Minimum 6 characters required
- Passwords are hashed with bcrypt
- Change default passwords immediately
- Use strong, unique passwords

### Mobile API Security
- Use HTTPS only in production
- Store JWT tokens securely
- Tokens expire after 30 days
- Implement logout functionality

---

## Getting Help

### Documentation
- **[TEACHER_FEATURE_SUMMARY.md](TEACHER_FEATURE_SUMMARY.md)** - Complete feature overview
- **[MOBILE_API_DOCUMENTATION.md](MOBILE_API_DOCUMENTATION.md)** - API reference

### Error Messages
- Check browser console for frontend errors
- Check server logs for backend errors
- Review API response messages
- Contact system administrator

---

## Quick Reference

### User Roles
| Role | Can Access | Dashboard |
|------|-----------|-----------|
| ADMIN | Everything | /admin |
| CASHIER | Student registration | /cashier |
| STAFF | Gate check-in, Chapel attendance | /staff |
| SECURITY | Gate verification | /security |
| TEACHER | Class attendance, View students | /teacher |

### API Endpoints
| Endpoint | Method | Access |
|----------|--------|--------|
| /api/mobile/auth/login | POST | All |
| /api/mobile/sessions | GET | STAFF, TEACHER |
| /api/mobile/students | GET, POST | STAFF, TEACHER |
| /api/mobile/attendance | GET, POST | STAFF, TEACHER |
| /api/mobile/checkin | GET, POST | STAFF only |
| /api/mobile/weekends | GET | STAFF, TEACHER |

### Data Structure
```
Course
  └── Classes (Class A, Class B, etc.)
       ├── Students (assigned to class)
       ├── Teachers (assigned to class)
       └── Sessions (scheduled for class)
```

---

**Ready to go!** Start by creating your course structure, then add classes and teachers. 🎓
