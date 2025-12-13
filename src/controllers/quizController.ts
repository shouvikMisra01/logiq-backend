// src/controllers/quizController.ts
/**
 * Quiz Controller - HTTP Request Handlers
 */

import { Request, Response } from 'express';
import { QuizService } from '../services/quizService';
import { StudyPlanService } from '../services/studyPlanService';

/**
 * Generate a new quiz
 * POST /api/quiz/generate
 */
export const generateQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[QuizController] Received quiz generation request:', {
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    const { student_id, school_id, class_id, subject, chapter } = req.body;

    // Validate required fields are present and non-empty strings
    if (!student_id || typeof student_id !== 'string' || student_id.trim() === '') {
      console.error('[QuizController] Invalid student_id:', student_id);
      res.status(400).json({
        error: 'Invalid or missing student_id (must be non-empty string)',
      });
      return;
    }

    if (!school_id || typeof school_id !== 'string' || school_id.trim() === '') {
      console.error('[QuizController] Invalid school_id:', school_id);
      res.status(400).json({
        error: 'Invalid or missing school_id (must be non-empty string)',
      });
      return;
    }

    if (!class_id || typeof class_id !== 'string' || class_id.trim() === '') {
      console.error('[QuizController] Invalid class_id:', class_id);
      res.status(400).json({
        error: 'Invalid or missing class_id (must be non-empty string)',
      });
      return;
    }

    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      console.error('[QuizController] Invalid subject:', subject);
      res.status(400).json({
        error: 'Invalid or missing subject (must be non-empty string)',
      });
      return;
    }

    if (!chapter || typeof chapter !== 'string' || chapter.trim() === '') {
      console.error('[QuizController] Invalid chapter:', chapter);
      res.status(400).json({
        error: 'Invalid or missing chapter (must be non-empty string)',
      });
      return;
    }

    console.log('[QuizController] Validation passed, calling QuizService.generateQuiz');

    const quizAttempt = await QuizService.generateQuiz({
      student_id: student_id.trim(),
      school_id: school_id.trim(),
      class_id: class_id.trim(),
      subject: subject.trim(),
      chapter: chapter.trim(),
    });

    console.log('[QuizController] Quiz generated successfully:', {
      quiz_id: quizAttempt.quiz_id,
      question_count: quizAttempt.questions?.length || 0,
    });

    // Check if this is an incomplete quiz being returned
    const isIncomplete = (quizAttempt as any)._isIncomplete;
    const incompleteCount = (quizAttempt as any)._incompleteCount;

    // Don't send correct answers to frontend
    const questionsForFrontend = quizAttempt.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      skills: q.skills,
      features: q.features,
    }));

    const response: any = {
      quiz_id: quizAttempt.quiz_id,
      quiz_index: quizAttempt.quiz_index,
      questions: questionsForFrontend,
      difficulty_level: quizAttempt.difficulty_level,
    };

    // Add message if this is an incomplete quiz
    if (isIncomplete) {
      response.message = `You have ${incompleteCount} incomplete quizzes for this topic. Please complete this quiz before generating new ones.`;
      response.isIncomplete = true;
    }

    res.status(201).json(response);
  } catch (error: any) {
    console.error('[QuizController] Error generating quiz:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
    });

    // Return specific error messages based on error type
    if (error.message?.includes('No syllabus found')) {
      res.status(404).json({
        error: error.message,
        details: 'The requested syllabus content is not available in the system',
      });
      return;
    }

    if (error.message?.includes('OPENAI_API_KEY')) {
      res.status(500).json({
        error: 'OpenAI API configuration error',
        details: 'The AI service is not properly configured',
      });
      return;
    }

    if (error.message?.includes('PDF not found') || error.message?.includes('Source PDF')) {
      res.status(404).json({
        error: 'Content not found',
        details: error.message,
      });
      return;
    }

    if (error.message?.includes('Failed to extract text from PDF')) {
      res.status(500).json({
        error: 'PDF processing error',
        details: 'Unable to extract content from the study material',
      });
      return;
    }

    if (error.message?.includes('Failed to generate questions')) {
      res.status(500).json({
        error: 'Question generation failed',
        details: error.message,
      });
      return;
    }

    // Generic error fallback
    res.status(500).json({
      error: 'Failed to generate quiz',
      details: error.message || 'An unexpected error occurred',
    });
  }
};

/**
 * Submit quiz answers
 * POST /api/quiz/submit
 */
export const submitQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quiz_id, answers } = req.body;

    if (!quiz_id || !answers || !Array.isArray(answers)) {
      res.status(400).json({
        error: 'Missing required fields: quiz_id, answers (array)',
      });
      return;
    }

    const result = await QuizService.submitQuiz({ quiz_id, answers });

    res.json(result);
  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to submit quiz' });
  }
};

/**
 * Get quiz by ID
 * GET /api/quiz/:quiz_id
 */
export const getQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quiz_id } = req.params;

    const quiz = await QuizService.getQuizById(quiz_id);

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    res.json(quiz);
  } catch (error: any) {
    console.error('Error getting quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to get quiz' });
  }
};

/**
 * Get all quizzes for a student
 * GET /api/quiz/student/:student_id
 */
export const getStudentQuizzes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id } = req.params;
    const { school_id, subject, chapter, submitted } = req.query;

    const filters: any = {};
    if (subject) filters.subject = subject as string;
    if (chapter) filters.chapter = chapter as string;
    if (submitted !== undefined) filters.submitted = submitted === 'true';

    const quizzes = await QuizService.getQuizzesForStudent(
      student_id,
      school_id as string | undefined,
      filters
    );

    res.json({ quizzes, count: quizzes.length });
  } catch (error: any) {
    console.error('Error getting student quizzes:', error);
    res.status(500).json({ error: error.message || 'Failed to get quizzes' });
  }
};

/**
 * Get student statistics
 * GET /api/quiz/student/:student_id/stats
 */
export const getStudentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id } = req.params;
    const { school_id } = req.query;

    const stats = await QuizService.getStudentStats(student_id, school_id as string | undefined);

    res.json(stats);
  } catch (error: any) {
    console.error('Error getting student stats:', error);
    res.status(500).json({ error: error.message || 'Failed to get stats' });
  }
};

/**
 * Generate study plan
 * POST /api/quiz/study-plan/generate
 */
export const generateStudyPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id, school_id } = req.body;

    if (!student_id || !school_id) {
      res.status(400).json({
        error: 'Missing required fields: student_id, school_id',
      });
      return;
    }

    const studyPlan = await StudyPlanService.generateStudyPlan({
      student_id,
      school_id,
    });

    res.status(201).json(studyPlan);
  } catch (error: any) {
    console.error('Error generating study plan:', error);
    res.status(500).json({ error: error.message || 'Failed to generate study plan' });
  }
};

/**
 * Get study plan for student
 * GET /api/quiz/study-plan/:student_id
 */
export const getStudyPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id } = req.params;

    const studyPlan = await StudyPlanService.getStudyPlanForStudent(student_id);

    if (!studyPlan) {
      res.status(404).json({ error: 'No study plan found for this student' });
      return;
    }

    res.json(studyPlan);
  } catch (error: any) {
    console.error('Error getting study plan:', error);
    res.status(500).json({ error: error.message || 'Failed to get study plan' });
  }
};

/**
 * Get all study plans for student
 * GET /api/quiz/study-plan/:student_id/all
 */
export const getAllStudyPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id } = req.params;

    const studyPlans = await StudyPlanService.getAllStudyPlansForStudent(student_id);

    res.json({ study_plans: studyPlans, count: studyPlans.length });
  } catch (error: any) {
    console.error('Error getting study plans:', error);
    res.status(500).json({ error: error.message || 'Failed to get study plans' });
  }
};
