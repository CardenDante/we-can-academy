# We Can Academy - Weekend Skills Development System

A luxury minimalist registration and attendance management system for weekend academy programs.

## 🎯 System Overview

We Can Academy is a weekend-only skills development program that offers 30 different courses. The system manages:
- Student registration with unique admission numbers (barcode/NFC)
- Attendance tracking for classes and chapel sessions
- Weekend scheduling with Saturday and Sunday sessions
- Multiple class divisions (A, B, C) per course
- Secure gate access verification

## 👥 User Roles

The system supports four distinct user roles:

1. **ADMIN** - Full system management
2. **CASHIER** - Student registration and lookup
3. **STAFF** - Attendance marking for classes and chapel
4. **SECURITY** - Gate access verification (read-only)

---

## 🔐 User Flow by Role

### **1. ADMIN User Flow**

#### Initial Login
1. Navigate to the login page
2. Enter credentials (default: `admin` / `admin123`)
3. System redirects to Admin Dashboard

#### Admin Dashboard Tasks

**A. User Management**
```
Admin Dashboard → Users → Create User
├─ Enter username, password, full name
├─ Select role (ADMIN, CASHIER, STAFF, SECURITY)
└─ Submit → User created
```

**B. Course & Class Setup**
```
Admin Dashboard → Courses
└─ View all 30 available courses (pre-seeded)

Admin Dashboard → Classes → Create Class
├─ Select course from dropdown
├─ Enter class name (A, B, C, etc.)
└─ Submit → Class created for course
```

**C. Weekend & Session Management**
```
Admin Dashboard → Weekends → Create Weekend
├─ Enter Saturday date
├─ Enter weekend name (e.g., "Weekend 1 - Jan 2025")
└─ Submit → Weekend created

Admin Dashboard → Sessions → Create Session
├─ Select weekend
├─ Select day (SATURDAY or SUNDAY)
├─ Select type (CLASS or CHAPEL)
├─ Enter session name (e.g., "Morning Session 9-11am")
├─ Enter start time and end time
└─ Submit → Session created

Admin Dashboard → Sessions → Assign Classes
├─ Select a CLASS session
├─ Assign one or more classes (e.g., Computer A, English B)
└─ Submit → Classes assigned to session
```

**D. View Students**
```
Admin Dashboard → Students
└─ View all registered students with details
```

---

### **2. CASHIER User Flow**

#### Initial Login
1. Navigate to the login page
2. Enter cashier credentials
3. System redirects to Cashier Dashboard

#### Registration Flow (Primary Function)
```
Cashier Dashboard → Register Student
├─ Fill in required fields:
│  ├─ Full Name
│  ├─ Admission Number (Receipt Number) ⭐ UNIQUE
│  ├─ Gender (Male/Female)
│  ├─ Course (dropdown of 30 courses)
│  ├─ Phone Number
│  ├─ Identification (ID/Passport number)
│  └─ Area of Residence
├─ Submit registration
└─ Receipt number becomes the barcode/NFC value
```

**Important Notes:**
- Receipt Number = Admission Number = Barcode/NFC scannable value
- Must be unique for each student
- Payment happens OUTSIDE the system
- Student is registered to ONE course only
- Student is NOT assigned to a class during registration

#### Student Search Flow
```
Cashier Dashboard → Search Students
├─ Enter admission number
├─ Submit search
└─ View student details:
   ├─ Personal information
   ├─ Course enrollment
   └─ Attendance history (with dates, sessions, classes)
```

---

### **3. STAFF User Flow**

#### Initial Login
1. Navigate to the login page
2. Enter staff credentials
3. System redirects to Staff Dashboard

#### Attendance Marking Flow

**MODE 1: CLASS Attendance**
```
Staff Dashboard → Select CLASS Mode
├─ Step 1: Select session from dropdown
│  └─ Shows available CLASS sessions for current weekend
├─ Step 2: Select class from dropdown
│  └─ Shows all classes (e.g., Computer A, English B)
├─ Step 3: Scan barcode or tap NFC
│  ├─ Input field is autofocused
│  ├─ Barcode scanner types admission number + Enter
│  ├─ System finds student by admission number
│  └─ System validates student exists
├─ Step 4: Confirm attendance marking
│  ├─ System creates attendance record with:
│  │  ├─ Student ID
│  │  ├─ Session ID
│  │  ├─ Class ID
│  │  └─ Marked by (staff name)
│  └─ Prevents duplicates (same student + session)
└─ View real-time attendance list
   └─ Shows recently marked students for this session
```

**MODE 2: CHAPEL Attendance**
```
Staff Dashboard → Select CHAPEL Mode
├─ Step 1: Select session from dropdown
│  └─ Shows available CHAPEL sessions for current weekend
├─ Step 2: Scan barcode or tap NFC
│  ├─ Input field is autofocused
│  ├─ Barcode scanner types admission number + Enter
│  ├─ System finds student by admission number
│  └─ System validates student exists
├─ Step 3: Confirm attendance marking
│  ├─ System creates attendance record with:
│  │  ├─ Student ID
│  │  ├─ Session ID
│  │  ├─ NO Class ID (chapel has no classes)
│  │  └─ Marked by (staff name)
│  └─ Prevents duplicates (same student + session)
└─ View real-time attendance list
   └─ Shows recently marked students for chapel session
```

**Barcode/NFC Scanning Details:**
- Input field has `autoFocus` enabled
- Scanner operates in HID keyboard emulation mode
- Scanner types the admission number and sends Enter key
- System automatically processes the scan on Enter
- Success message displays with student name
- Attendance list updates in real-time

---

### **4. SECURITY User Flow**

#### Initial Login
1. Navigate to the login page
2. Enter security credentials
3. System redirects to Security Dashboard

#### Gate Verification Flow (Read-Only)
```
Security Dashboard → Scan Entry
├─ Large input field (always focused)
├─ Scan barcode or tap NFC
│  ├─ Barcode scanner types admission number + Enter
│  └─ System searches for student
├─ Student Found:
│  ├─ Display with green border (verified)
│  ├─ Show student photo area (future enhancement)
│  ├─ Display full details:
│  │  ├─ Admission Number
│  │  ├─ Full Name
│  │  ├─ Gender
│  │  ├─ Course
│  │  ├─ Phone Number
│  │  ├─ Identification
│  │  └─ Area of Residence
│  └─ Show attendance history:
│     └─ Last 10 attendance records with:
│        ├─ Weekend name
│        ├─ Session name and type
│        ├─ Class (if applicable)
│        └─ Date and time marked
└─ Student Not Found:
   └─ Display error message (red alert)
```

**Important Notes:**
- Security CANNOT mark attendance
- Read-only access to student information
- Used for gate entry verification
- Large input optimized for scanning devices
- Auto-clears after each scan

---

## 🔄 Complete Registration to Attendance Flow

### **End-to-End Process**

```
1. ADMIN SETUP (One-time)
   ├─ Create users (cashiers, staff, security)
   ├─ Create classes for courses (A, B, C)
   ├─ Create weekends (Saturday dates)
   └─ Create sessions and assign classes

2. STUDENT REGISTRATION (Cashier)
   ├─ Student pays for course (external)
   ├─ Cashier receives receipt number
   ├─ Cashier registers student in system
   │  └─ Receipt number = Admission number
   ├─ System generates unique admission number
   └─ Student receives barcode/NFC card

3. WEEKEND ATTENDANCE (Staff)
   Saturday Morning:
   ├─ Staff opens CLASS mode
   ├─ Selects "Saturday Morning 9-11am" session
   ├─ Selects "Computer Class A"
   ├─ Students arrive and scan barcodes
   ├─ System marks attendance for each scan
   └─ Staff monitors attendance list

   Sunday Chapel:
   ├─ Staff opens CHAPEL mode
   ├─ Selects "Sunday Chapel 8-9am" session
   ├─ Students arrive and scan barcodes
   ├─ System marks attendance (no class)
   └─ Staff monitors attendance list

4. GATE VERIFICATION (Security)
   ├─ Student arrives at gate
   ├─ Security scans student's barcode/NFC
   ├─ System displays student details
   ├─ Security verifies identity
   └─ Student is allowed entry
```

---

## 🎫 Barcode/NFC Setup

### **Compatible Devices**
- USB Barcode Scanners (HID keyboard mode)
- Bluetooth Barcode Scanners (keyboard mode)
- NFC Readers (keyboard emulation mode)
- Mobile phones with scanner apps

### **Scanner Configuration**
1. Set scanner to **HID keyboard emulation mode**
2. Configure to send **Enter key** after scan
3. Test scanner types correctly into input fields
4. Ensure scanner prefix/suffix settings are correct

### **Usage**
- Point scanner at barcode on student card
- Scanner automatically types admission number
- Scanner sends Enter key
- System processes the scan immediately
- Success/error message displays

---

## 📋 Key Business Rules

### **Students**
- ✅ One student = One admission number (unique)
- ✅ One student = One course enrollment
- ✅ Students are NOT assigned to classes during registration
- ✅ Students can attend any class of their enrolled course
- ✅ Receipt number = Admission number = Barcode value

### **Sessions**
- ✅ Sessions belong to a specific weekend
- ✅ Sessions are either SATURDAY or SUNDAY
- ✅ Sessions are either CLASS or CHAPEL type
- ✅ CLASS sessions can have multiple classes assigned
- ✅ CHAPEL sessions have NO classes

### **Attendance**
- ✅ One attendance record per student per session
- ✅ Duplicate prevention: Same student cannot be marked twice for same session
- ✅ CLASS attendance requires class selection
- ✅ CHAPEL attendance has no class
- ✅ Attendance records include staff name who marked it

### **Weekends**
- ✅ Academy operates ONLY on weekends
- ✅ Weekends are identified by Saturday date
- ✅ Each weekend can have multiple sessions
- ✅ Saturday and Sunday chapel sessions are different

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ installed
- PostgreSQL database running

### **Installation**
```bash
cd reg-system
npm install
npx prisma generate
npx prisma db seed
```

### **Development**
```bash
# Start database
npx prisma dev

# Start application
npm run dev
```

### **Access**
- URL: `http://localhost:3000`
- Default Admin: `admin` / `admin123`

### **Production Build**
```bash
npm run build
npm start
```

---

## 🎨 Design Features

### **Luxury Minimalist Aesthetic**
- ✅ Roboto font family with multiple weights
- ✅ Elegant gradient backgrounds
- ✅ Glass-morphism header effects
- ✅ Smooth animations and transitions
- ✅ Luxury card shadows with hover effects
- ✅ Gradient icon badges with scale animations
- ✅ Clean, spacious layouts with professional spacing

### **Color Scheme**
- **Primary (Blue)**: `#0080FF` - Navigation and actions
- **Secondary (Yellow)**: `#FFD500` - Accents and highlights
- **White**: Card backgrounds
- **Gradients**: Icon backgrounds and subtle page gradients

---

## 🔒 Security Features

- ✅ NextAuth v5 session-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Protected routes with middleware
- ✅ Secure password hashing with bcrypt
- ✅ CSRF protection built-in
- ✅ SQL injection prevention via Prisma ORM

---

## 📊 Database Schema

```
User (id, username, password, name, role)
Course (id, name)
Class (id, name, courseId)
Weekend (id, saturdayDate, name)
Session (id, weekendId, day, sessionType, name, startTime, endTime)
SessionClass (id, sessionId, classId)
Student (id, admissionNumber [UNIQUE], fullName, gender, courseId, ...)
Attendance (id, studentId, sessionId, classId?, markedAt, markedBy)
  └─ UNIQUE constraint on (studentId, sessionId)
```

---

## 📞 Support

For issues or questions:
- Check the git repository for updates
- Review the database schema for data relationships
- Test with admin account first before creating other users

---

## ✅ System Status

- ✅ Production build successful
- ✅ All 17 routes generated
- ✅ TypeScript compilation passed
- ✅ Database migrations applied
- ✅ Seed data loaded (30 courses + admin user)
- ✅ Barcode/NFC scanning implemented
- ✅ Luxury minimalist design applied

**System Version**: 1.0.0  
**Last Updated**: January 2026
