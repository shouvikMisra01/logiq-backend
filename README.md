# LogiQ Backend API

AI-powered adaptive learning platform backend built with Node.js, Express, TypeScript, and MongoDB.

## 🚀 Features

- **Multi-tenant Architecture**: Support for multiple schools, classes, and students
- **Four User Roles**: Super Admin, School Admin, Student, Parent
- **Quiz V2 System**: Intelligent question set reuse with MongoDB-based storage
- **AI Integration**: OpenAI/Gemini-powered question generation and evaluation
- **Rubric-based Assessment**: Skill-based evaluation (memorization, reasoning, numerical, language)
- **Study Plan Generation**: AI-generated personalized weekly study plans
- **PDF Processing**: Syllabus upload and parsing
- **Real-time Monitoring**: Quiz attempt tracking and skill statistics

## 📋 Prerequisites

- Node.js 18+
- MongoDB 4.4+
- npm or yarn
- OpenAI API key (for AI features)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd logiq-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=8000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ai_tutor_db
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai_tutor_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI Configuration (for AI features)
OPENAI_API_KEY=your-openai-api-key

# Google Gemini (optional alternative)
GEMINI_API_KEY=your-gemini-api-key

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

4. **Initialize MongoDB indexes**
```bash
npm run create-indexes
```

5. **Seed test data** (optional)
```bash
npm run seed
```

This creates test accounts:
- Super Admin: `admin@logiq.com` / `admin123`
- School Admin: `admin@greenfield.edu` / `admin123`
- Student: `aditi@student.com` / `student123`
- Parent: `parent.aditi@example.com` / `parent123`

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```
Server runs on http://localhost:8000

### Production Mode
```bash
npm run build
npm start
```

## 📁 Project Structure

```
logiq-backend/
├── src/
│   ├── index.ts              # Entry point
│   ├── config/
│   │   └── database.ts       # MongoDB configuration
│   ├── controllers/          # Request handlers
│   │   ├── authController.ts
│   │   ├── newQuizController.ts
│   │   ├── parentController.ts
│   │   ├── schoolController.ts
│   │   └── studentController.ts
│   ├── services/             # Business logic
│   │   ├── authService.ts
│   │   ├── questionSetService.ts
│   │   ├── attemptService.ts
│   │   ├── skillStatsService.ts
│   │   └── studyPlanService.ts
│   ├── routes/               # API routes
│   │   ├── auth.ts
│   │   ├── newQuiz.ts
│   │   ├── parents.ts
│   │   ├── schools.ts
│   │   └── students.ts
│   ├── middleware/
│   │   └── auth.ts           # JWT authentication
│   ├── validators/           # Request validation
│   ├── types/                # TypeScript types
│   └── scripts/              # Utility scripts
├── pdfs/                     # Uploaded PDF storage
├── package.json
├── tsconfig.json
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - Login (all roles)
- `POST /api/auth/logout` - Logout

### Schools (Super Admin)
- `GET /api/schools` - List all schools
- `POST /api/schools` - Create school
- `PUT /api/schools/:id` - Update school
- `DELETE /api/schools/:id` - Delete school

### Students (School Admin)
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Quiz V2 System
- `POST /api/v2/quiz/generate` - Generate quiz
- `POST /api/v2/quiz/submit` - Submit quiz answers
- `GET /api/v2/quiz/history` - Get quiz history
- `GET /api/v2/quiz/stats` - Get student statistics

### Parent Dashboard
- `GET /api/parents/child-info` - Get child information
- `GET /api/parents/quiz-history` - Get child's quiz history
- `GET /api/parents/progress` - Get child's progress

### Study Plans
- `POST /api/quiz/study-plan` - Generate study plan
- `GET /api/quiz/study-plan/:student_id` - Get latest study plan

## 🗄️ MongoDB Collections

- **admins**: Super admin and school admin accounts
- **students**: Student accounts and profiles
- **parents**: Parent accounts linked to students
- **schools**: School information and settings
- **question_sets**: Reusable quiz question sets
- **question_set_attempts**: Student quiz attempts
- **student_skill_stats**: Granular skill tracking
- **study_plans**: AI-generated study plans
- **chapters**: PDF syllabus documents
- **syllabi**: Parsed syllabus structures

## 🧪 Testing

Run the Quiz V2 test script:
```bash
npm run test:quiz
```

## 📚 API Documentation

See [QUIZ_V2_API.md](./QUIZ_V2_API.md) for detailed API documentation.

## 🔐 Security

- JWT-based authentication
- Password hashing with SHA-256
- Role-based access control (RBAC)
- CORS configuration
- Environment variable protection

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT License

## 🆘 Support

For issues and questions, please open a GitHub issue.

## 🔗 Related

- Frontend Repository: [logiq-frontend](https://github.com/shouvikMisra01/logiq-frontend)
