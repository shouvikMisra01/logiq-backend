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
} from '../controllers/quizController';

const router: Router = express.Router();

// Quiz operations
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
