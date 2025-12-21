import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/auth';
import dataRoutes from './routes/data';
import schoolRoutes from './routes/schools';
import studentRoutes from './routes/students';
import parentRoutes from './routes/parents';
import quizRoutes from './routes/quiz';
import newQuizRoutes from './routes/newQuiz';
import syllabusRoutes from './routes/syllabus';
import uploadRoutes from "./routes/upload";
import chaptersRoutes from "./routes/chapters";
import teacherRoutes from './routes/teachers';
import classesRoutes from './routes/classes';
import passwordRoutes from './routes/password';
import schoolAdminRoutes from './routes/schoolAdmin';
import { errorHandler } from './middleware/errorMiddleware';

const app: Application = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// 1. CORS: Strict Origin Policy (MUST BE FIRST)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:3000',        // Local development
        'https://logiq.zetaq.in',       // Production frontend
    ];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
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

// 2. Helmet: Set secure HTTP headers
app.use(helmet());

// 3. Rate Limiting: Prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15 mins (Increased for Dashboard usage)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter); // Apply to all API routes

// 4. Mongo Sanitize: Prevent NoSQL injection
app.use(mongoSanitize());

app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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
app.use('/api/classes', classesRoutes);
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

// Error handling middleware (Must be last)
app.use(errorHandler);

export default app;
