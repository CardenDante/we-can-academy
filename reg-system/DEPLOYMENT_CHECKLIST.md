# Deployment Checklist - Flexible Attendance Model

## Pre-Deployment

### 1. Backup Database
```bash
# Create backup before making changes
pg_dump your_database > backup_before_flexible_model_$(date +%Y%m%d).sql
```

### 2. Review Changes
- [ ] Read [FLEXIBLE_ATTENDANCE_MODEL.md](FLEXIBLE_ATTENDANCE_MODEL.md)
- [ ] Read [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md)
- [ ] Understand the new model

---

## Deployment Steps

### Step 1: Apply Database Migration
```bash
cd /home/chacha/we-can-academy/reg-system

# Apply the migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

**Expected Output**:
```
✅ Migration applied: 20260122000001_remove_student_class_assignment
✅ Prisma Client generated
```

### Step 2: Verify Database Changes
```bash
# Connect to database and verify
psql your_database

# Check Student table (should NOT have classId column)
\d "Student"

# Exit
\q
```

### Step 3: Restart Application
```bash
# If using npm
npm run build
npm start

# If using Docker
docker-compose restart

# If using PM2
pm2 restart all
```

### Step 4: Test Core Functionality
- [ ] Admin can login
- [ ] Teacher can login
- [ ] Teacher dashboard loads
- [ ] Teacher can see all course students
- [ ] No errors in console

---

## Post-Deployment Testing

### Test 1: Teacher Dashboard
1. Login as teacher
2. **Check**: Dashboard shows "Course Students" count
3. **Check**: Click "My Students" - shows all course students
4. **Expected**: All students in teacher's course displayed

### Test 2: Student List
1. As teacher, go to Students page
2. **Check**: All course students shown (not just one class)
3. **Check**: Can view any student's profile
4. **Expected**: Full course enrollment visible

### Test 3: Mark Attendance
1. As teacher, go to Mark Attendance
2. Select a session
3. Scan/enter any course student's admission number
4. **Expected**: Attendance marked successfully
5. **Check**: Attendance list updates

### Test 4: Mobile API
```bash
# Test login
curl -X POST http://your-domain/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher.john","password":"password"}'

# Save the token, then test students endpoint
curl -X GET http://your-domain/api/mobile/students \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Returns all course students
```

### Test 5: Student Profile
1. As teacher, click on a student
2. **Check**: Profile loads correctly
3. **Check**: Attendance history shows
4. **Check**: No class assignment displayed
5. **Expected**: Clean profile view

---

## Verification Checklist

### Database
- [ ] `classId` column removed from Student table
- [ ] Students only link to courses
- [ ] Attendance records still have classId (which class attended)
- [ ] Teacher records still have classId (their assigned class)

### Teacher Functionality
- [ ] Teachers see all course students
- [ ] Teachers can mark any course student
- [ ] Teachers only see their class sessions
- [ ] Attendance tracking works correctly

### Student Flexibility
- [ ] Students can be registered without class selection
- [ ] Students can attend any class in their course
- [ ] Attendance records track which class attended
- [ ] Student profiles don't show class assignment

### Mobile API
- [ ] Authentication works
- [ ] Students endpoint returns course students
- [ ] Attendance marking works
- [ ] Permission checks verify course enrollment

---

## Rollback Procedure (If Needed)

### 1. Restore Database
```bash
# Restore from backup
psql your_database < backup_before_flexible_model_YYYYMMDD.sql
```

### 2. Revert Code
```bash
# Revert to previous commit
git log  # Find the commit before changes
git revert <commit-hash>
```

### 3. Restart Application
```bash
npm run build
npm start
# or your deployment method
```

---

## Common Issues & Solutions

### Issue 1: Migration Fails
**Error**: `Column "classId" does not exist`
**Solution**: Column might already be removed, skip migration

### Issue 2: Teacher Can't See Students
**Error**: `Teacher profile not found`
**Solution**: Verify teacher account exists and is assigned to a class

### Issue 3: Attendance Marking Fails
**Error**: `Student not in your course`
**Solution**: Verify student is enrolled in same course as teacher's class

### Issue 4: Mobile API Returns 401
**Error**: `Unauthorized`
**Solution**: Check JWT token is valid and included in Authorization header

---

## Monitoring

### What to Monitor
1. **Error Logs**: Check for any errors in application logs
2. **Database Queries**: Monitor for slow queries
3. **User Feedback**: Gather feedback from teachers
4. **Attendance Patterns**: Track if flexible model is being used

### Log Files to Check
```bash
# Application logs
tail -f /path/to/app/logs

# Database logs
tail -f /var/log/postgresql/postgresql-*.log

# System logs
journalctl -u your-app-service -f
```

---

## User Communication

### Notify Teachers
```
Subject: New Flexible Attendance System

We've updated the attendance system to give students more flexibility!

What's New:
- Students can now attend ANY class in their course
- You can mark any student in your course who attends your session
- Students are no longer locked to one class time

What This Means For You:
- Your student list now shows ALL students in your course
- You can mark attendance for any of these students
- Students may attend different classes on different days

No action needed - just mark attendance as usual!
```

### Notify Students
```
Subject: Flexible Class Attendance Now Available

Great news! You now have more flexibility in attending classes.

What Changed:
- You can attend ANY class session in your enrolled course
- You're not locked to one specific class or time
- Attend morning, afternoon, or evening - whatever works for you!

Example:
If you're in Programming:
- Monday: Attend Class A (Morning)
- Tuesday: Attend Class B (Afternoon)
- Wednesday: Attend Class C (Evening)

Your choice!
```

---

## Success Criteria

✅ Migration applied successfully
✅ No database errors
✅ Teachers can login and see course students
✅ Attendance marking works
✅ Mobile API functions correctly
✅ No critical bugs reported
✅ User feedback is positive

---

## Timeline

### Day 1 (Deployment Day)
- Morning: Apply migration
- Morning: Test core functionality
- Afternoon: Monitor for issues
- Evening: Review any problems

### Day 2-3 (Monitoring)
- Continue monitoring logs
- Address any issues
- Gather user feedback

### Week 1 (Evaluation)
- Review attendance patterns
- Check if flexible model is used
- Collect teacher feedback
- Plan any adjustments

---

## Support Contacts

- **Technical Issues**: System Administrator
- **User Questions**: Help Desk
- **Documentation**: See markdown files in project root

---

## Final Checklist

Before marking as complete:
- [ ] Database migration applied
- [ ] Application restarted
- [ ] All tests passed
- [ ] No critical errors
- [ ] Teachers notified
- [ ] Students notified
- [ ] Monitoring in place
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Documentation updated

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Status**: ⬜ Pending / ⬜ In Progress / ⬜ Complete
**Issues**: _____________

---

Good luck with the deployment! 🚀
