# Test Login Credentials

## Quick Reference

All 3 dashboard types now have test accounts you can use to login.

---

## 1️⃣  Super Admin Dashboard (Real JWT Authentication)

**Email:** `admin@logiq.com`
**Password:** `admin123`
**Role:** `super_admin`

**Features:**
- Create and manage schools
- Upload global datasets
- View all schools and students
- System-wide administration

---

## 2️⃣  School Admin Dashboard (Real JWT Authentication)

**Email:** `admin@greenfield.edu`
**Password:** `admin123`
**Role:** `school_admin`
**School:** Greenfield High School

**Features:**
- Manage school students
- Upload school-specific syllabus
- View school performance
- Class and subject management

---

## 3️⃣  Student Dashboard (Real JWT Authentication)

**Email:** `aditi@student.com`
**Password:** `student123`
**School:** Greenfield High School
**Class:** Class 9
**Role:** `student`

**Features:**
- View subjects dynamically loaded from syllabus
- Select chapter/topic for quiz
- Take AI-generated quizzes (10 MCQs)
- View rubric-based evaluation
- Track progress and performance
- Generate weekly study plans

---

## 4️⃣  Parent Dashboard (Real JWT Authentication)

**Email:** `parent.aditi@example.com`
**Password:** `parent123`
**School:** Greenfield High School
**Child:** Aditi Sharma (Class 9)
**Role:** `parent`

**Features:**
- View child's information (name, class, school)
- Monitor child's quiz history and performance
- Access child's progress reports and rubric scores
- View AI-generated weekly study plans for child
- Track strong topics and areas for improvement
- Receive AI-powered recommendations
- Read-only access to child's learning data

---

## Running the Application

### Backend
```bash
cd backend
npm run dev
# Server starts on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm run dev
# App starts on http://localhost:3000
```

---

## Resetting/Updating Test Users

If you need to recreate or update test users:

```bash
cd backend
npm run seed
```

This will create/update:
- Test school (Greenfield High School)
- Test student (Aditi Sharma) with proper password hashing

---

## Notes

- **All 3 user types** now use real JWT authentication with MongoDB lookup
- Passwords are hashed using SHA-256
- JWT tokens expire after 7 days
- Token and user data stored in localStorage on login
- Dashboard automatically routes to the correct view based on user role

---

## Database Collections

The following MongoDB collections are used:

- `schools` - School information
- `students` - Student accounts with hashed passwords
- `admins` - Super admin and school admin accounts with hashed passwords
- `parents` - Parent accounts linked to student records
- `syllabi` - AI-parsed syllabus structure (class → subjects → chapters → topics)
- `quiz_attempts` - Student quiz history and scores
- `chapters` - PDF documents and metadata
- `study_plans` - AI-generated weekly study plans

---

## Test Data Created

### School
- **ID:** `school_001`
- **Name:** Greenfield High School
- **City:** Mumbai, Maharashtra
- **Contact:** admin@greenfield.edu

### Super Admin
- **ID:** `admin_super_001`
- **Name:** Super Admin
- **Email:** admin@logiq.com
- **Role:** super_admin

### School Admin
- **ID:** `admin_school_001`
- **Name:** School Admin
- **Email:** admin@greenfield.edu
- **Role:** school_admin
- **School ID:** school_001

### Student
- **ID:** `student_001`
- **Name:** Aditi Sharma
- **Email:** aditi@student.com
- **Class:** Class 9
- **School ID:** school_001

### Parent
- **ID:** `parent_001`
- **Name:** Aditi's Parent
- **Email:** parent.aditi@example.com
- **Child Student ID:** student_001
- **Child Name:** Aditi Sharma
- **School ID:** school_001
