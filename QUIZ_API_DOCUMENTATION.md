# Quiz API Documentation

## Overview

The Quiz API provides comprehensive functionality for:
- Generating AI-powered quizzes from PDF chapter content
- Submitting quiz answers and evaluating performance
- Tracking student progress with feature-based scoring (memorization, reasoning, numerical, language)
- Generating personalized weekly study plans based on quiz performance

All quiz questions are generated using the Groq AI API with CBSE-aligned rubric standards.

---

## Base URL

```
http://localhost:8000/api/quiz
```

---

## Quiz Generation

### Generate Quiz

Generate 10 multiple-choice questions from a chapter PDF using AI.

**Endpoint:** `POST /api/quiz/generate`

**Request Body:**
```json
{
  "student_id": "student_001",
  "school_id": "school_001",
  "class_id": "8",
  "subject": "math",
  "chapter": "ch5"
}
```

**Response:** `201 Created`
```json
{
  "quiz_id": "quiz_a1b2c3d4e5f6",
  "quiz_index": 1,
  "difficulty_level": 6,
  "questions": [
    {
      "id": "Q1",
      "question": "What is the value of x in the equation 2x + 5 = 15?",
      "options": ["5", "10", "7.5", "12.5"],
      "skills": ["numerical", "reasoning"],
      "features": {
        "memorization": 0.2,
        "reasoning": 0.6,
        "numerical": 0.9,
        "language": 0.3,
        "difficulty_score": 5.0,
        "difficulty_level": 5
      }
    }
  ]
}
```

**Notes:**
- PDF must exist at `pdfs/{class_id}_{subject}_{chapter}.pdf` (e.g., `pdfs/8_math_ch5.pdf`)
- Maximum 5 quizzes per student per chapter
- Each quiz contains exactly 10 questions
- Questions include at least:
  - 3 numerical/calculation questions (numerical >= 0.7)
  - 3 reasoning/conceptual questions (reasoning >= 0.7)
  - 2 memory/definition questions (memorization >= 0.7)
  - 2 language/comprehension questions (language >= 0.7)

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `404 Not Found` - PDF file not found
- `500 Internal Server Error` - Quiz generation failed

---

## Quiz Submission

### Submit Quiz Answers

Submit student answers for evaluation and scoring.

**Endpoint:** `POST /api/quiz/submit`

**Request Body:**
```json
{
  "quiz_id": "quiz_a1b2c3d4e5f6",
  "answers": [
    {
      "question_id": "Q1",
      "chosen_index": 0
    },
    {
      "question_id": "Q2",
      "chosen_index": 2
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "score_total": 0.7,
  "correct_count": 7,
  "total_questions": 10,
  "difficulty_level": 6,
  "feature_scores": {
    "memorization": 0.85,
    "reasoning": 0.62,
    "numerical": 0.74,
    "language": 0.91
  }
}
```

**Scoring Explanation:**
- `score_total`: Fraction of correct answers (0-1)
- `feature_scores`: Performance in each skill area (0-1)
  - Calculated by weighing correct answers against question difficulty
  - Lower scores (<0.6) indicate areas needing improvement

**Error Responses:**
- `400 Bad Request` - Missing quiz_id or answers
- `404 Not Found` - Quiz not found
- `500 Internal Server Error` - Submission failed

---

## Quiz Retrieval

### Get Quiz by ID

Retrieve a specific quiz with all details including correct answers.

**Endpoint:** `GET /api/quiz/:quiz_id`

**Response:** `200 OK`
```json
{
  "quiz_id": "quiz_a1b2c3d4e5f6",
  "student_id": "student_001",
  "school_id": "school_001",
  "class_id": "8",
  "subject": "math",
  "chapter": "ch5",
  "quiz_index": 1,
  "questions": [ ... ],
  "answers": {
    "Q1": 0,
    "Q2": 2
  },
  "score_total": 0.7,
  "feature_scores": { ... },
  "created_at": "2025-11-28T10:00:00.000Z",
  "submitted_at": "2025-11-28T10:15:00.000Z"
}
```

### Get Student Quizzes

List all quizzes for a student with optional filters.

**Endpoint:** `GET /api/quiz/student/:student_id`

**Query Parameters:**
- `school_id` (optional) - Filter by school
- `subject` (optional) - Filter by subject
- `chapter` (optional) - Filter by chapter
- `submitted` (optional) - Filter by submission status (true/false)

**Example:**
```
GET /api/quiz/student/student_001?subject=math&submitted=true
```

**Response:** `200 OK`
```json
{
  "quizzes": [ ... ],
  "count": 5
}
```

---

## Student Statistics

### Get Student Stats

Get comprehensive statistics for a student across all submitted quizzes.

**Endpoint:** `GET /api/quiz/student/:student_id/stats`

**Query Parameters:**
- `school_id` (optional) - Filter by school

**Response:** `200 OK`
```json
{
  "total_quizzes": 12,
  "average_score": 0.75,
  "feature_scores": {
    "memorization": 0.82,
    "reasoning": 0.68,
    "numerical": 0.71,
    "language": 0.89
  },
  "subjects": {
    "math": {
      "total_quizzes": 5,
      "average_score": 0.71,
      "features": {
        "memorization": 0.78,
        "reasoning": 0.65,
        "numerical": 0.82,
        "language": 0.70
      }
    },
    "science": {
      "total_quizzes": 7,
      "average_score": 0.78,
      "features": {
        "memorization": 0.85,
        "reasoning": 0.70,
        "numerical": 0.63,
        "language": 0.92
      }
    }
  }
}
```

---

## Study Plan Generation

### Generate Weekly Study Plan

Generate a personalized 7-day study plan based on the last 7 days of quiz performance.

**Endpoint:** `POST /api/quiz/study-plan/generate`

**Request Body:**
```json
{
  "student_id": "student_001",
  "school_id": "school_001"
}
```

**Response:** `201 Created`
```json
{
  "student_id": "student_001",
  "week_start": "2025-11-25T00:00:00.000Z",
  "created_at": "2025-11-28T10:00:00.000Z",
  "plan": {
    "week_overview": "Focus on improving numerical and reasoning skills in Math and Science",
    "subjects": {
      "math": {
        "summary": "Strengthen problem-solving and numerical calculations",
        "skills": {
          "memorization": 0.78,
          "reasoning": 0.55,
          "numerical": 0.62,
          "language": 0.82
        }
      }
    },
    "days": [
      {
        "day": "Monday",
        "tasks": [
          {
            "subject": "Math",
            "focus_skills": ["reasoning", "numerical"],
            "chapter_hint": "Review Ch5: Linear Equations",
            "activity": "Solve 15-20 word problems involving linear equations. Focus on understanding the reasoning behind each step rather than memorizing formulas.",
            "estimated_time_min": 45
          },
          {
            "subject": "Science",
            "focus_skills": ["memorization"],
            "chapter_hint": "Ch3: Metals and Non-metals",
            "activity": "Create flashcards for key properties, definitions, and reactions. Review 3 times throughout the day.",
            "estimated_time_min": 30
          }
        ]
      }
    ]
  }
}
```

**Study Plan Logic:**
- Analyzes quizzes from last 7 days
- Identifies weak skills (< 0.6) per subject
- Recommends targeted activities:
  - `numerical < 0.6` → Problem-solving tasks with step-by-step solutions
  - `memorization < 0.6` → Flashcards, formula revision, key points
  - `language < 0.6` → Reading comprehension, summary writing
  - `reasoning < 0.6` → Conceptual why/how questions, comparisons
- Total daily time: 90-120 minutes

**Requirements:**
- Student must have at least 1 submitted quiz in the last 7 days
- If no quizzes exist, returns `400 Bad Request`

### Get Study Plan

Retrieve the most recent study plan for a student.

**Endpoint:** `GET /api/quiz/study-plan/:student_id`

**Response:** `200 OK`
```json
{
  "student_id": "student_001",
  "week_start": "2025-11-25T00:00:00.000Z",
  "plan": { ... },
  "created_at": "2025-11-28T10:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found` - No study plan exists for this student

### Get All Study Plans

Retrieve all historical study plans for a student.

**Endpoint:** `GET /api/quiz/study-plan/:student_id/all`

**Response:** `200 OK`
```json
{
  "study_plans": [ ... ],
  "count": 3
}
```

---

## Feature Scoring System

### Feature Definitions

Each question has four feature scores (0-1) representing the intensity of different cognitive demands:

1. **Memorization** (0-1)
   - Recall of facts, formulas, definitions
   - Example: "What is the formula for the area of a circle?"

2. **Reasoning** (0-1)
   - Conceptual understanding, cause-effect, comparisons
   - Example: "Why does ice float on water?"

3. **Numerical** (0-1)
   - Calculations, problem-solving, quantitative analysis
   - Example: "If 2x + 5 = 15, what is x?"

4. **Language** (0-1)
   - Reading comprehension, interpretation, expression
   - Example: "Based on the passage, what was the author's main argument?"

### Difficulty Calculation

Question difficulty is computed as:
```
difficulty_score = (memorization × 0.25) + (reasoning × 0.25) +
                  (numerical × 0.25) + (language × 0.25)
```

- Scaled to 0-10 range
- Rounded to difficulty_level (1-10)

### Performance Scoring

Student performance per feature:
```
feature_score = Σ(feature_value for correct answers) /
                Σ(feature_value for all questions)
```

Example:
- Question with numerical=0.9: If answered correctly, student gains 0.9 numerical score
- If total numerical demand is 5.0 and student gained 3.5, numerical score = 0.70

---

## Setup Instructions

### 1. Environment Variables

Add to `.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
PDF_FOLDER=pdfs
```

### 2. PDF File Structure

Place chapter PDFs in the `pdfs/` directory with naming format:
```
pdfs/{class_id}_{subject}_{chapter}.pdf
```

Examples:
- `pdfs/8_math_ch5.pdf` → Class 8, Math, Chapter 5
- `pdfs/10_science_ch3.pdf` → Class 10, Science, Chapter 3

### 3. Get Groq API Key

1. Sign up at https://console.groq.com
2. Generate an API key
3. Add to `.env` file

---

## Example Workflow

### Complete Quiz Flow:

```bash
# 1. Generate quiz
curl -X POST http://localhost:8000/api/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "student_001",
    "school_id": "school_001",
    "class_id": "8",
    "subject": "math",
    "chapter": "ch5"
  }'

# Response includes quiz_id and questions

# 2. Student answers questions (frontend)

# 3. Submit answers
curl -X POST http://localhost:8000/api/quiz/submit \
  -H "Content-Type: application/json" \
  -d '{
    "quiz_id": "quiz_a1b2c3d4e5f6",
    "answers": [
      {"question_id": "Q1", "chosen_index": 0},
      {"question_id": "Q2", "chosen_index": 2}
    ]
  }'

# 4. View student stats
curl http://localhost:8000/api/quiz/student/student_001/stats

# 5. Generate study plan (after multiple quizzes)
curl -X POST http://localhost:8000/api/quiz/study-plan/generate \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "student_001",
    "school_id": "school_001"
  }'
```

---

## MongoDB Collections

### quiz_attempts
```javascript
{
  quiz_id: "quiz_a1b2c3d4e5f6",
  student_id: "student_001",
  school_id: "school_001",
  class_id: "8",
  subject: "math",
  chapter: "ch5",
  quiz_index: 1,
  week_number: 48,
  questions: [ ... ],
  answers: { "Q1": 0, "Q2": 2 },
  score_total: 0.7,
  feature_scores: {
    memorization: 0.85,
    reasoning: 0.62,
    numerical: 0.74,
    language: 0.91
  },
  difficulty_avg: 5.8,
  difficulty_level: 6,
  created_at: ISODate("2025-11-28T10:00:00Z"),
  submitted_at: ISODate("2025-11-28T10:15:00Z")
}
```

### study_plans
```javascript
{
  student_id: "student_001",
  week_start: ISODate("2025-11-25T00:00:00Z"),
  plan: { ... },
  created_at: ISODate("2025-11-28T10:00:00Z")
}
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `200 OK` - Successful retrieval
- `201 Created` - Successful creation
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server-side error

---

## Rate Limiting & Best Practices

1. **Quiz Generation**: CPU-intensive, limit to 1 request per 10 seconds per student
2. **Study Plan Generation**: Requires quiz history, generate max once per week
3. **Caching**: Consider caching quiz questions for re-attempts
4. **PDF Storage**: Keep PDFs under 10MB for optimal processing

---

## Testing

Test quiz generation (requires PDF):
```bash
# Ensure PDF exists
ls -la pdfs/8_math_ch5.pdf

# Generate quiz
curl -X POST http://localhost:8000/api/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{"student_id":"test_student","school_id":"test_school","class_id":"8","subject":"math","chapter":"ch5"}'
```
