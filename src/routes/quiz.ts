// src/routes/quiz.ts
/**
 * Quiz Routes
 */

import express, { Router } from 'express';
import {
  generateQuiz,
  submitQuiz,
  getQuiz,
  getStudentQuizzes,
  getStudentStats,
  generateStudyPlan,
  getStudyPlan,
  getAllStudyPlans,
  generateQuizV2,
  submitQuizV2,
} from '../controllers/quizController';

const router: Router = express.Router();

// ============================================================================
// V2 QUIZ API - REUSABLE QUIZ SETS (NEW SYSTEM)
// ============================================================================
// These routes implement quiz set reuse across students
router.post('/v2/generate', generateQuizV2);
router.post('/v2/submit', submitQuizV2);

// ============================================================================
// V1 QUIZ API - LEGACY SYSTEM (PRESERVED FOR BACKWARD COMPATIBILITY)
// ============================================================================
// Quiz operations (old system)
router.post('/generate', generateQuiz);
router.post('/submit', submitQuiz);
router.get('/:quiz_id', getQuiz);

// Student quiz queries
router.get('/student/:student_id', getStudentQuizzes);
router.get('/student/:student_id/stats', getStudentStats);

// Study plan operations
router.post('/study-plan/generate', generateStudyPlan);
router.get('/study-plan/:student_id', getStudyPlan);
router.get('/study-plan/:student_id/all', getAllStudyPlans);

export default router;
