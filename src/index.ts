// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import dataRoutes from './routes/data';
import schoolRoutes from './routes/schools';
import studentRoutes from './routes/students';
import parentRoutes from './routes/parents';
import quizRoutes from './routes/quiz';
import newQuizRoutes from './routes/newQuiz';
import syllabusRoutes from './routes/syllabus';
import { connectDB } from './config/database';
import uploadRoutes from "./routes/upload";
import chaptersRoutes from "./routes/chapters";
import teacherRoutes from './routes/teachers';
import passwordRoutes from './routes/password';
import schoolAdminRoutes from './routes/schoolAdmin';
import { initializePdfDirectory } from './utils/pathUtils';

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '5000');

// CORS Configuration for Local and Production
const allowedOrigins = [
  'http://localhost:3000',        // Local development
  'https://logiq.zetaq.in',       // Production frontend
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', passwordRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/quiz-v2', newQuizRoutes); // New redesigned quiz API
app.use('/api/syllabus', syllabusRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/chapters", chaptersRoutes);
app.use('/api', teacherRoutes);
app.use('/api/school-admin', schoolAdminRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Root endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'AI Tutor Backend API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      schools: '/api/schools',
      students: '/api/students',
      parents: '/api/parents',
      auth: '/api/auth',
      data: '/api/data',
      quiz: '/api/quiz',
      quiz_v2: '/api/quiz-v2',
      health: '/api/health',
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Connect to MongoDB and start server
connectDB()
  .then(async () => {
    // Initialize PDF directory and list available PDFs
    await initializePdfDirectory();

    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log(`✅ MongoDB connected successfully`);
      console.log(`📚 API endpoints available at /api`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  });
