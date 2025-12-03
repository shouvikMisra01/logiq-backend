# Quiz V2 API Documentation

## Overview

The Quiz V2 API provides a redesigned data model for managing AI-generated quizzes with:
- **Reusable question sets** stored separately from student attempts
- **Per-question skill tracking** (memorization, reasoning, numerical, language)
- **Aggregated student statistics** for analytics and dashboards
- **Smart set selection** - reuses unattempted sets before generating new ones

## Base URL

```
http://localhost:8000/api/quiz-v2
```

---

## Collections

### 1. `question_sets`

Stores reusable AI-generated question sets for specific topics.

```typescript
{
  set_id: string;                  // Unique identifier
  class_number: number;            // e.g. 9
  class_label: string;             // e.g. "Class 9"
  subject: string;                 // Normalized subject name
  chapter: string;
  topic: string;
  questions: Question[];           // Array of 10 questions
  difficulty_level: number;        // Overall set difficulty (1-5)
  created_at: Date;
  created_by?: string;             // student_id who triggered generation
}
```

### 2. `question_set_attempts`

Stores per-student attempts of question sets.

```typescript
{
  attempt_id: string;
  student_id: string;
  school_id: string;
  set_id: string;                  // Reference to question_sets
  class_number: number;
  class_label: string;
  subject: string;
  chapter: string;
  topic: string;
  answers: QuestionAnswer[];       // [{question_id, selected_option_index, is_correct}]
  score_total: number;             // 0-10
  score_percentage: number;        // 0-100
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  features_aggregated: {           // Weighted average
    memorization: number;
    reasoning: number;
    numerical: number;
    language: number;
  };
  submitted_at: Date;
}
```

### 3. `student_skill_stats`

Aggregated skill statistics per student and subject.

```typescript
{
  student_id: string;
  school_id: string;
  class_number: number;
  subject: string;
  topic?: string;                  // Optional: for topic-level stats
  total_questions_answered: number;
  correct_count: number;
  incorrect_count: number;
  accuracy_percentage: number;
  skills: SkillScore[];            // [{skill_name, score, mastery_level, questions_answered}]
  features_avg: QuestionFeatures;
  last_attempt_at?: Date;
  updated_at: Date;
}
```

---

## Endpoints

### 1. Generate Quiz

**Endpoint:** `POST /api/quiz-v2/generate`

**Description:**
Generates or retrieves a quiz for a student. Follows this logic:
1. Check if student has attempted all existing sets for the topic
2. If unattempted sets exist → return a random unattempted set
3. If all sets attempted → generate new AI question set

**Request Body:**
```json
{
  "student_id": "student_001",
  "school_id": "school_001",
  "class_number": 9,
  "class_label": "Class 9",
  "subject": "Physics",
  "chapter": "Motion",
  "topic": "Velocity and Acceleration",
  "num_questions": 10
}
```

**Response:**
```json
{
  "set_id": "set_abc123",
  "questions": [
    {
      "id": "Q1",
      "question": "What is velocity?",
      "options": ["Speed with direction", "Only speed", "Only direction", "None"],
      "correct_option_index": 0,
      "skills": ["memorization"],
      "features": {
        "memorization": 0.8,
        "reasoning": 0.2,
        "numerical": 0.0,
        "language": 0.1
      },
      "difficulty_score": 0.3
    }
    // ... 9 more questions
  ],
  "difficulty_level": 2,
  "is_new_set": false,
  "message": "Returning an existing question set you have not attempted yet"
}
```

---

### 2. Submit Quiz

**Endpoint:** `POST /api/quiz-v2/submit`

**Description:**
Submits student answers, creates an attempt record, and updates skill statistics.

**Request Body:**
```json
{
  "student_id": "student_001",
  "school_id": "school_001",
  "set_id": "set_abc123",
  "answers": [
    {
      "question_id": "Q1",
      "selected_option_index": 0
    },
    {
      "question_id": "Q2",
      "selected_option_index": 2
    }
    // ... all 10 answers
  ]
}
```

**Response:**
```json
{
  "attempt_id": "attempt_xyz789",
  "score_total": 8,
  "score_percentage": 80,
  "correct_count": 8,
  "incorrect_count": 2,
  "total_questions": 10,
  "features_aggregated": {
    "memorization": 0.75,
    "reasoning": 0.65,
    "numerical": 0.55,
    "language": 0.70
  },
  "skill_breakdown": [
    {
      "skill_name": "memorization",
      "score": 0.82,
      "mastery_level": "competent",
      "questions_answered": 45
    },
    {
      "skill_name": "reasoning",
      "score": 0.68,
      "mastery_level": "competent",
      "questions_answered": 32
    }
  ]
}
```

---

### 3. Get Quiz History

**Endpoint:** `GET /api/quiz-v2/history/:student_id?subject=...&topic=...&limit=...`

**Description:** Get student's quiz attempt history with optional filters.

**Query Parameters:**
- `subject` (optional) - Filter by subject
- `topic` (optional) - Filter by topic
- `limit` (optional, default: 20) - Max number of attempts to return

**Example:**
```
GET /api/quiz-v2/history/student_001?subject=Physics&limit=10
```

**Response:**
```json
{
  "attempts": [
    {
      "attempt_id": "attempt_xyz789",
      "set_id": "set_abc123",
      "subject": "Physics",
      "topic": "Velocity and Acceleration",
      "score_percentage": 80,
      "correct_count": 8,
      "total_questions": 10,
      "submitted_at": "2025-12-02T10:30:00Z"
    }
    // ... more attempts
  ],
  "count": 10
}
```

---

### 4. Get Student Stats

**Endpoint:** `GET /api/quiz-v2/stats/:student_id/:subject?topic=...`

**Description:** Get aggregated skill statistics for a student in a subject.

**Example:**
```
GET /api/quiz-v2/stats/student_001/Physics
```

**Response:**
```json
{
  "student_id": "student_001",
  "school_id": "school_001",
  "class_number": 9,
  "subject": "Physics",
  "total_questions_answered": 150,
  "correct_count": 120,
  "incorrect_count": 30,
  "accuracy_percentage": 80,
  "skills": [
    {
      "skill_name": "memorization",
      "score": 0.82,
      "mastery_level": "competent",
      "questions_answered": 60
    },
    {
      "skill_name": "reasoning",
      "score": 0.75,
      "mastery_level": "competent",
      "questions_answered": 50
    },
    {
      "skill_name": "numerical",
      "score": 0.68,
      "mastery_level": "competent",
      "questions_answered": 40
    }
  ],
  "features_avg": {
    "memorization": 0.82,
    "reasoning": 0.75,
    "numerical": 0.68,
    "language": 0.72
  },
  "last_attempt_at": "2025-12-02T10:30:00Z",
  "updated_at": "2025-12-02T10:35:00Z"
}
```

---

### 5. Get All Student Stats

**Endpoint:** `GET /api/quiz-v2/stats/:student_id`

**Description:** Get all stats across all subjects for a student.

**Response:**
```json
{
  "stats": [
    {
      "subject": "Physics",
      "accuracy_percentage": 80,
      "total_questions_answered": 150,
      "skills": [...]
    },
    {
      "subject": "Chemistry",
      "accuracy_percentage": 75,
      "total_questions_answered": 100,
      "skills": [...]
    }
  ],
  "count": 2
}
```

---

### 6. Get Topic Performance

**Endpoint:** `GET /api/quiz-v2/topics/:student_id/:subject`

**Description:** Get performance breakdown by topic for a subject.

**Response:**
```json
{
  "topics": [
    {
      "topic": "Velocity and Acceleration",
      "attempts": 5,
      "avg_score": 78.5,
      "last_attempt": "2025-12-02T10:30:00Z"
    },
    {
      "topic": "Newton's Laws",
      "attempts": 3,
      "avg_score": 85.2,
      "last_attempt": "2025-12-01T14:20:00Z"
    }
  ],
  "count": 2
}
```

---

### 7. Get Attempt Details

**Endpoint:** `GET /api/quiz-v2/attempt/:attempt_id`

**Description:** Get detailed information about a specific attempt, including the full question set.

**Response:**
```json
{
  "attempt": {
    "attempt_id": "attempt_xyz789",
    "answers": [
      {
        "question_id": "Q1",
        "selected_option_index": 0,
        "is_correct": true
      }
      // ... all answers
    ],
    "score_percentage": 80,
    // ... full attempt data
  },
  "question_set": {
    "set_id": "set_abc123",
    "questions": [
      // ... full questions with correct answers
    ]
  }
}
```

---

### 8. Get Class Stats (Teacher/Admin)

**Endpoint:** `GET /api/quiz-v2/class-stats/:school_id/:class_number/:subject`

**Description:** Get aggregated statistics for an entire class.

**Example:**
```
GET /api/quiz-v2/class-stats/school_001/9/Physics
```

**Response:**
```json
{
  "total_students": 30,
  "avg_accuracy": 75.5,
  "avg_skills": [
    {
      "skill_name": "memorization",
      "score": 0.78,
      "mastery_level": "competent",
      "questions_answered": 0
    },
    {
      "skill_name": "reasoning",
      "score": 0.72,
      "mastery_level": "competent",
      "questions_answered": 0
    }
  ]
}
```

---

## Skill Types

The system tracks 4 types of skills per question:

1. **memorization** (0-1) - Measures recall and memory
2. **reasoning** (0-1) - Measures logical thinking
3. **numerical** (0-1) - Measures mathematical computation
4. **language** (0-1) - Measures reading comprehension

Each question has a `features` object with scores for all 4 skills, and a `skills` array listing the primary skills.

## Mastery Levels

Based on skill score (0-1):
- **novice** (0.0 - 0.39)
- **learner** (0.4 - 0.59)
- **competent** (0.6 - 0.79)
- **expert** (0.8 - 1.0)

---

## Integration Notes

### For Student Dashboard:
```typescript
// Generate quiz
const quiz = await fetch('/api/quiz-v2/generate', {
  method: 'POST',
  body: JSON.stringify({
    student_id,
    school_id,
    class_number,
    class_label,
    subject,
    chapter,
    topic,
  }),
});

// Submit answers
const result = await fetch('/api/quiz-v2/submit', {
  method: 'POST',
  body: JSON.stringify({
    student_id,
    school_id,
    set_id: quiz.set_id,
    answers,
  }),
});

// Get stats
const stats = await fetch(`/api/quiz-v2/stats/${student_id}/${subject}`);
```

### For Parent Dashboard:
```typescript
// Get child's stats (use child_student_id from parent JWT)
const stats = await fetch(`/api/quiz-v2/stats/${childStudentId}/${subject}`);

// Get quiz history
const history = await fetch(`/api/quiz-v2/history/${childStudentId}?limit=20`);

// Get topic performance
const topics = await fetch(`/api/quiz-v2/topics/${childStudentId}/${subject}`);
```

### For Teacher/Admin Dashboard:
```typescript
// Get class stats
const classStats = await fetch(
  `/api/quiz-v2/class-stats/${schoolId}/${classNumber}/${subject}`
);
```

---

## Migration from Old API

If you're migrating from the old `/api/quiz` endpoints:

**Old:** `POST /api/quiz/generate`
**New:** `POST /api/quiz-v2/generate`

**Old:** `POST /api/quiz/submit`
**New:** `POST /api/quiz-v2/submit`

The new API provides:
- Reusable question sets (reduces AI generation costs)
- Detailed skill tracking
- Better analytics capabilities
- Topic-level performance insights

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing required fields)
- `404` - Resource not found
- `500` - Server error
