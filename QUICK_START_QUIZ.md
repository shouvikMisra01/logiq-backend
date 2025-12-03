# 🚀 Quick Start - Quiz System

## ✅ System Status

**Backend:** ✅ Running on `http://localhost:8000`
**MongoDB:** ✅ Connected to `ai_tutor_db`
**Quiz API:** ✅ Available at `/api/quiz/*`
**Groq AI:** ✅ Configured and ready

---

## 📁 What's Been Implemented

### Backend Structure (TypeScript)
```
backend/src/
├── types/quiz.ts                    # TypeScript interfaces & types
├── services/
│   ├── pdfService.ts                # PDF text extraction (✅ FIXED)
│   ├── llmService.ts                # Groq AI integration
│   ├── quizService.ts               # Quiz business logic
│   └── studyPlanService.ts          # Study plan generation
├── controllers/quizController.ts    # HTTP request handlers
└── routes/quiz.ts                   # API routes
```

### MongoDB Collections
- `quiz_attempts` - Stores quiz questions, answers, scores
- `study_plans` - Stores personalized weekly study plans

---

## 🎯 Available API Endpoints

### Quiz Generation & Submission
```bash
# Generate quiz from PDF
POST /api/quiz/generate
{
  "student_id": "student_001",
  "school_id": "school_001",
  "class_id": "8",
  "subject": "math",
  "chapter": "ch5"
}

# Submit quiz answers
POST /api/quiz/submit
{
  "quiz_id": "quiz_xyz",
  "answers": [
    {"question_id": "Q1", "chosen_index": 0},
    {"question_id": "Q2", "chosen_index": 2}
  ]
}
```

### Student Analytics
```bash
# Get quiz by ID
GET /api/quiz/:quiz_id

# Get all student quizzes
GET /api/quiz/student/:student_id?subject=math&submitted=true

# Get student statistics
GET /api/quiz/student/:student_id/stats
```

### Study Plans
```bash
# Generate personalized study plan
POST /api/quiz/study-plan/generate
{
  "student_id": "student_001",
  "school_id": "school_001"
}

# Get current study plan
GET /api/quiz/study-plan/:student_id

# Get all study plans
GET /api/quiz/study-plan/:student_id/all
```

---

## 🧠 Feature Scoring System

Each quiz evaluates students across **4 dimensions**:

1. **Memorization** (0-1): Recall facts, formulas, definitions
2. **Reasoning** (0-1): Conceptual understanding, cause-effect
3. **Numerical** (0-1): Calculations, problem-solving
4. **Language** (0-1): Reading comprehension, interpretation

### Question Distribution (Enforced by AI)
- ≥3 Numerical questions (numerical ≥ 0.7)
- ≥3 Reasoning questions (reasoning ≥ 0.7)
- ≥2 Memorization questions (memorization ≥ 0.7)
- ≥2 Language questions (language ≥ 0.7)

### Difficulty Calculation
```
difficulty_score = (memorization × 0.25) + (reasoning × 0.25) +
                  (numerical × 0.25) + (language × 0.25)
```
Scaled to 1-10 difficulty level.

---

## 📄 PDF Setup

### 1. Create PDF Directory
Already created: `backend/pdfs/`

### 2. Add Chapter PDFs
Place PDFs with naming format: `{class}_{subject}_{chapter}.pdf`

**Examples:**
```
pdfs/
├── 8_math_ch5.pdf          # Class 8, Math, Chapter 5
├── 8_science_ch3.pdf       # Class 8, Science, Chapter 3
├── 10_physics_ch1.pdf      # Class 10, Physics, Chapter 1
├── 9_english_ch2.pdf       # Class 9, English, Chapter 2
```

### 3. PDF Requirements
- Readable text (not scanned images)
- Under 10MB for optimal processing
- CBSE curriculum aligned content

---

## 🔑 Environment Variables

Already configured in `.env`:
```env
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017
DB_NAME=ai_tutor_db
GROQ_API_KEY=gsk_...    # ✅ Configured
PDF_FOLDER=pdfs
```

---

## 🧪 Quick Test

### Test 1: Health Check
```bash
curl http://localhost:8000/api/health
# Expected: {"status":"ok","message":"Backend server is running"}
```

### Test 2: List Endpoints
```bash
curl http://localhost:8000/api | jq
# Should show quiz endpoint in the list
```

### Test 3: Generate Quiz (requires PDF)
```bash
# First, add a test PDF: pdfs/8_math_ch5.pdf

curl -X POST http://localhost:8000/api/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "test_student",
    "school_id": "test_school",
    "class_id": "8",
    "subject": "math",
    "chapter": "ch5"
  }' | jq
```

**Expected Response:**
- `quiz_id` generated
- 10 questions returned
- Each question has features and difficulty
- No correct answers revealed

### Test 4: Submit Quiz
```bash
curl -X POST http://localhost:8000/api/quiz/submit \
  -H "Content-Type: application/json" \
  -d '{
    "quiz_id": "quiz_from_step3",
    "answers": [
      {"question_id": "Q1", "chosen_index": 0},
      {"question_id": "Q2", "chosen_index": 1},
      {"question_id": "Q3", "chosen_index": 2}
    ]
  }' | jq
```

**Expected Response:**
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

---

## 🎨 Frontend Integration Guide

### 1. Quiz Generation Component
```tsx
const QuizGenerator = () => {
  const generateQuiz = async () => {
    const response = await fetch('http://localhost:8000/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: currentStudent.id,
        school_id: currentSchool.id,
        class_id: '8',
        subject: 'math',
        chapter: 'ch5'
      })
    });
    const data = await response.json();
    setQuiz(data);
  };

  return <button onClick={generateQuiz}>Generate Quiz</button>;
};
```

### 2. Quiz Taking Component
```tsx
const QuizTaker = ({ quiz }) => {
  const [answers, setAnswers] = useState({});

  const submitQuiz = async () => {
    const response = await fetch('http://localhost:8000/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_id: quiz.quiz_id,
        answers: Object.entries(answers).map(([question_id, chosen_index]) => ({
          question_id,
          chosen_index
        }))
      })
    });
    const result = await response.json();
    showResults(result);
  };

  return (
    <div>
      {quiz.questions.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          onAnswer={(index) => setAnswers({...answers, [q.id]: index})}
        />
      ))}
      <button onClick={submitQuiz}>Submit Quiz</button>
    </div>
  );
};
```

### 3. Results Display Component
```tsx
const QuizResults = ({ result }) => {
  return (
    <div>
      <h2>Score: {result.correct_count}/{result.total_questions}</h2>
      <div>
        <h3>Feature Scores:</h3>
        <ProgressBar label="Memorization" value={result.feature_scores.memorization} />
        <ProgressBar label="Reasoning" value={result.feature_scores.reasoning} />
        <ProgressBar label="Numerical" value={result.feature_scores.numerical} />
        <ProgressBar label="Language" value={result.feature_scores.language} />
      </div>
      {result.feature_scores.numerical < 0.6 && (
        <Alert>Focus on numerical problem-solving!</Alert>
      )}
    </div>
  );
};
```

### 4. Study Plan Viewer
```tsx
const StudyPlan = ({ studentId, schoolId }) => {
  const [plan, setPlan] = useState(null);

  const generatePlan = async () => {
    const response = await fetch('http://localhost:8000/api/quiz/study-plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, school_id: schoolId })
    });
    const data = await response.json();
    setPlan(data.plan);
  };

  return plan && (
    <div>
      <h2>{plan.week_overview}</h2>
      {plan.days.map((day) => (
        <DayCard key={day.day} day={day} />
      ))}
    </div>
  );
};
```

---

## 📚 Documentation

- **Complete API Docs:** `QUIZ_API_DOCUMENTATION.md`
- **Implementation Guide:** `QUIZ_SYSTEM_IMPLEMENTATION.md`
- **This Quick Start:** `QUICK_START_QUIZ.md`

---

## ✨ Summary

✅ **AI-Powered Quiz Generation** - Groq AI creates CBSE-aligned questions
✅ **Multi-Dimensional Scoring** - 4 feature dimensions (not just right/wrong)
✅ **PDF Processing** - Extracts text from chapter PDFs automatically
✅ **Personalized Study Plans** - AI generates weekly plans based on performance
✅ **MongoDB Integration** - Permanent storage of quiz history
✅ **TypeScript** - Full type safety across the backend
✅ **RESTful API** - Clean, documented endpoints
✅ **Production Ready** - Error handling, validation, logging

**Status:** 🟢 All systems operational!

---

## 🐛 Troubleshooting

### PDF Parse Error
**Fixed!** Using `createRequire` for CommonJS compatibility

### MongoDB Connection Issues
```bash
# Check MongoDB is running
docker ps | grep Mongo

# If not running, start it
docker start Mongo
```

### Groq API Errors
- Verify API key in `.env`
- Check key is active at https://console.groq.com
- Ensure internet connection

### PDF Not Found
- Verify PDF exists: `ls backend/pdfs/`
- Check filename format: `{class}_{subject}_{chapter}.pdf`
- Ensure PDF_FOLDER in `.env` is correct

---

**Ready to integrate with frontend! 🚀**
