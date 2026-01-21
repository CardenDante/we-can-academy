# Mobile App API Documentation

## Overview

This API provides endpoints for the WE-CAN Academy mobile application. The API supports offline capabilities through JWT token authentication and returns data in JSON format.

**Base URL**: `https://your-domain.com/api/mobile`

**Access**: Only **STAFF** and **TEACHER** roles can access the mobile API.

---

## Authentication

### Login

Authenticate a user and receive a JWT token.

**Endpoint**: `POST /auth/login`

**Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "string",
    "username": "string",
    "name": "string",
    "role": "STAFF | TEACHER",
    "teacher": {
      // Only present for TEACHER role
      "id": "string",
      "classId": "string",
      "class": {
        "id": "string",
        "name": "string",
        "course": {
          "id": "string",
          "name": "string"
        }
      }
    }
  }
}
```

**Error Responses**:
- `400`: Missing username or password
- `401`: Invalid credentials
- `403`: Access denied (not STAFF or TEACHER)

---

## Authorization

All subsequent requests must include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Token expires after 30 days.

---

## Endpoints

### 1. Weekends

#### Get Weekends

Get list of academy weekends.

**Endpoint**: `GET /weekends`

**Query Parameters**:
- `limit` (optional): Number of results (default 10, max 50)

**Success Response** (200):
```json
{
  "success": true,
  "weekends": [
    {
      "id": "string",
      "saturdayDate": "2024-01-20T00:00:00.000Z",
      "name": "Weekend 1",
      "isCompleted": false,
      "completedAt": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      "_count": {
        "sessions": 4,
        "checkIns": 150
      }
    }
  ]
}
```

---

### 2. Sessions

#### Get Sessions

Get list of sessions. For teachers, only returns their class sessions.

**Endpoint**: `GET /sessions`

**Query Parameters**:
- `weekendId` (optional): Filter by weekend ID
- `sessionType` (optional): `CHAPEL` or `CLASS`

**Success Response** (200):
```json
{
  "success": true,
  "sessions": [
    {
      "id": "string",
      "weekendId": "string",
      "day": "SATURDAY | SUNDAY",
      "sessionType": "CLASS | CHAPEL",
      "name": "Session 1",
      "startTime": "09:00",
      "endTime": "11:00",
      "weekend": {
        "id": "string",
        "saturdayDate": "2024-01-20T00:00:00.000Z",
        "name": "Weekend 1"
      },
      "sessionClasses": [
        {
          "class": {
            "id": "string",
            "name": "Class A",
            "course": {
              "id": "string",
              "name": "Programming"
            }
          }
        }
      ],
      "_count": {
        "attendances": 25
      }
    }
  ]
}
```

---

### 3. Students

#### Get Students

Get list of students. For teachers, only returns students in their class.

**Endpoint**: `GET /students`

**Query Parameters**:
- `search` (optional): Search by name or admission number
- `classId` (optional): Filter by class ID

**Success Response** (200):
```json
{
  "success": true,
  "students": [
    {
      "id": "string",
      "admissionNumber": "2024001",
      "fullName": "John Doe",
      "gender": "MALE | FEMALE",
      "courseId": "string",
      "classId": "string",
      "areaOfResidence": "City",
      "phoneNumber": "+1234567890",
      "identification": "ID12345",
      "profilePicture": "https://...",
      "churchDistrict": "District A",
      "isExpelled": false,
      "hasWarning": false,
      "course": {
        "id": "string",
        "name": "Programming"
      },
      "class": {
        "id": "string",
        "name": "Class A"
      }
    }
  ]
}
```

#### Get Student by Admission Number

**Endpoint**: `POST /students`

**Body**:
```json
{
  "admissionNumber": "2024001"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "student": {
    // Same structure as above
  }
}
```

**Error Responses**:
- `400`: Missing admission number
- `403`: Student not in your class (for teachers)
- `404`: Student not found

---

### 4. Attendance

#### Get Attendance for Session

**Endpoint**: `GET /attendance?sessionId=<id>`

**Query Parameters**:
- `sessionId` (required): Session ID

**Success Response** (200):
```json
{
  "success": true,
  "attendances": [
    {
      "id": "string",
      "studentId": "string",
      "sessionId": "string",
      "classId": "string",
      "markedAt": "2024-01-20T10:30:00.000Z",
      "markedBy": "Teacher Name",
      "student": {
        "id": "string",
        "admissionNumber": "2024001",
        "fullName": "John Doe",
        "profilePicture": "https://...",
        "course": {
          "name": "Programming"
        },
        "class": {
          "name": "Class A"
        }
      },
      "session": {
        "id": "string",
        "name": "Session 1",
        "weekend": {
          "name": "Weekend 1",
          "saturdayDate": "2024-01-20T00:00:00.000Z"
        }
      }
    }
  ]
}
```

#### Mark Attendance

**Endpoint**: `POST /attendance`

**Body**:
```json
{
  "studentId": "string",
  "sessionId": "string",
  "classId": "string" // Optional, auto-set for teachers
}
```

**Success Response** (200):
```json
{
  "success": true,
  "attendance": {
    // Same structure as above
  }
}
```

**Error Responses**:
- `400`: Missing required fields, student expelled, not checked in (for chapel), or already marked
- `403`: Student not in your class (for teachers)
- `404`: Student or session not found

---

### 5. Check-In (Gate Entry)

**Note**: Only **STAFF** can use check-in endpoints.

#### Check In Student

**Endpoint**: `POST /checkin`

**Body**:
```json
{
  "admissionNumber": "2024001"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "status": "checked_in",
  "checkIn": {
    "id": "string",
    "studentId": "string",
    "weekendId": "string",
    "day": "SATURDAY | SUNDAY",
    "checkedAt": "2024-01-20T08:30:00.000Z",
    "checkedBy": "Staff Name",
    "status": "PRESENT",
    "student": {
      "id": "string",
      "admissionNumber": "2024001",
      "fullName": "John Doe",
      "profilePicture": "https://...",
      "hasWarning": false,
      "course": {
        "name": "Programming"
      },
      "class": {
        "name": "Class A"
      }
    },
    "weekend": {
      "id": "string",
      "name": "Weekend 1",
      "saturdayDate": "2024-01-20T00:00:00.000Z"
    }
  },
  "student": {
    // Same student object
  }
}
```

**Error Responses**:
- `400`: Not a weekend day, student already checked in, or missing admission number
- `404`: Student or weekend not found

**Special Case - Expelled Student** (400):
```json
{
  "error": "ALERT: John Doe has been EXPELLED",
  "status": "expelled",
  "student": {
    // Student object with isExpelled: true
  }
}
```

#### Get Today's Check-Ins

**Endpoint**: `GET /checkin`

**Success Response** (200):
```json
{
  "success": true,
  "checkIns": [
    {
      // Same structure as check-in response
    }
  ],
  "weekend": {
    "id": "string",
    "name": "Weekend 1",
    "saturdayDate": "2024-01-20T00:00:00.000Z"
  },
  "day": "SATURDAY | SUNDAY"
}
```

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid or missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Offline Support

### Token Storage
- Store the JWT token securely on the device
- Token is valid for 30 days
- Implement token refresh logic before expiry

### Data Syncing
1. **Queue Failed Requests**: When offline, queue attendance marking and check-in requests locally
2. **Sync on Reconnect**: When internet connection is restored, process queued requests
3. **Conflict Resolution**:
   - If a student was already marked while offline, display appropriate error
   - Log conflicts for manual review

### Recommended Caching Strategy
1. **Cache Sessions**: Download sessions for current and next weekend
2. **Cache Students**: Download full student list for teacher's class or all students for staff
3. **Cache Weekends**: Download recent weekends for reference
4. **Sync Attendance**: Periodically sync attendance records when online

---

## Rate Limiting

No rate limiting is currently implemented, but it's recommended to:
- Limit API calls to reasonable intervals
- Batch operations when possible
- Implement exponential backoff for retries

---

## Security Best Practices

1. **HTTPS Only**: All API calls must use HTTPS in production
2. **Token Storage**: Store JWT tokens securely (encrypted storage)
3. **Token Transmission**: Only send tokens in Authorization header
4. **Logout**: Delete stored token on logout
5. **Validation**: Always validate responses before using data

---

## Example Usage Flow

### Teacher Marking Class Attendance

```javascript
// 1. Login
const loginResponse = await fetch('/api/mobile/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'teacher1',
    password: 'password123'
  })
});
const { token, user } = await loginResponse.json();

// 2. Get sessions
const sessionsResponse = await fetch('/api/mobile/sessions', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { sessions } = await sessionsResponse.json();

// 3. Get students
const studentsResponse = await fetch('/api/mobile/students', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { students } = await studentsResponse.json();

// 4. Mark attendance
const attendanceResponse = await fetch('/api/mobile/attendance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    studentId: students[0].id,
    sessionId: sessions[0].id
  })
});
const { attendance } = await attendanceResponse.json();
```

### Staff Gate Check-In

```javascript
// 1. Login (same as above)

// 2. Check in student by admission number
const checkinResponse = await fetch('/api/mobile/checkin', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    admissionNumber: '2024001'
  })
});
const { checkIn, student, status } = await checkinResponse.json();

// 3. Get today's check-ins
const todayResponse = await fetch('/api/mobile/checkin', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { checkIns, weekend, day } = await todayResponse.json();
```

---

## Support

For API issues or questions, contact the system administrator.
