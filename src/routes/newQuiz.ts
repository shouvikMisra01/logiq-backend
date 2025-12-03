// src/routes/newQuiz.ts
/**
 * New Quiz Routes - Using the redesigned data model
 */

import express, { Router } from 'express';
import { NewQuizController } from '../controllers/newQuizController';

const router: Router = express.Router();

// ============================================================
// QUIZ GENERATION & SUBMISSION
// ============================================================

// POST /api/quiz-v2/generate - Generate or retrieve a quiz
router.post('/generate', NewQuizController.generateQuiz);

// POST /api/quiz-v2/submit - Submit quiz answers
router.post('/submit', NewQuizController.submitQuiz);

// ============================================================
// STUDENT ANALYTICS
// ============================================================

// GET /api/quiz-v2/history/:student_id - Get quiz history
router.get('/history/:student_id', NewQuizController.getQuizHistory);

// GET /api/quiz-v2/stats/:student_id/:subject - Get student stats for a subject
router.get('/stats/:student_id/:subject', NewQuizController.getStudentStats);

// GET /api/quiz-v2/stats/:student_id - Get all student stats
router.get('/stats/:student_id', NewQuizController.getAllStudentStats);

// GET /api/quiz-v2/topics/:student_id/:subject - Get topic performance
router.get('/topics/:student_id/:subject', NewQuizController.getTopicPerformance);

// GET /api/quiz-v2/attempt/:attempt_id - Get detailed attempt
router.get('/attempt/:attempt_id', NewQuizController.getAttemptDetails);

// ============================================================
// CLASS/TEACHER ANALYTICS
// ============================================================

// GET /api/quiz-v2/class-stats/:school_id/:class_number/:subject
router.get(
  '/class-stats/:school_id/:class_number/:subject',
  NewQuizController.getClassStats
);

export default router;
