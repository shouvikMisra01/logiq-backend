// src/controllers/quizController.ts
/**
 * Quiz Controller - HTTP Request Handlers
 */

import { Request, Response } from 'express';
import { QuizService } from '../services/quizService';
import { StudyPlanService } from '../services/studyPlanService';
import { QuestionSetService } from '../services/questionSetService';
import type { GenerateQuizRequest, SubmitQuizRequest } from '../types/questionSet';

/**
 * Validation helper for quiz generation payload
 */
interface ValidationError {
  field: string;
  message: string;
  receivedValue: any;
  expectedType: string;
}

function validateQuizPayload(body: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // studentId: required, non-empty string
  if (!body.studentId || typeof body.studentId !== 'string' || body.studentId.trim() === '') {
    errors.push({
      field: 'studentId',
      message: 'Required field must be a non-empty string',
      receivedValue: body.studentId,
      expectedType: 'string',
    });
  }

  // schoolId: required, non-empty string
  if (!body.schoolId || typeof body.schoolId !== 'string' || body.schoolId.trim() === '') {
    errors.push({
      field: 'schoolId',
      message: 'Required field must be a non-empty string',
      receivedValue: body.schoolId,
      expectedType: 'string',
    });
  }

  // classNumber: required, positive number
  if (!body.classNumber || typeof body.classNumber !== 'number' || body.classNumber <= 0) {
    errors.push({
      field: 'classNumber',
      message: 'Required field must be a positive number (e.g., 9, 10, 11)',
      receivedValue: body.classNumber,
      expectedType: 'number',
    });
  }

  // subject: required, non-empty string
  if (!body.subject || typeof body.subject !== 'string' || body.subject.trim() === '') {
    errors.push({
      field: 'subject',
      message: 'Required field must be a non-empty string',
      receivedValue: body.subject,
      expectedType: 'string',
    });
  }

  // chapter: required, non-empty string
  if (!body.chapter || typeof body.chapter !== 'string' || body.chapter.trim() === '') {
    errors.push({
      field: 'chapter',
      message: 'Required field must be a non-empty string',
      receivedValue: body.chapter,
      expectedType: 'string',
    });
  }

  // topic: required, non-empty string
  if (!body.topic || typeof body.topic !== 'string' || body.topic.trim() === '') {
    errors.push({
      field: 'topic',
      message: 'Required field must be a non-empty string',
      receivedValue: body.topic,
      expectedType: 'string',
    });
  }

  // difficulty: optional string
  if (body.difficulty !== undefined && typeof body.difficulty !== 'string') {
    errors.push({
      field: 'difficulty',
      message: 'Optional field must be a string if provided',
      receivedValue: body.difficulty,
      expectedType: 'string',
    });
  }

  return errors;
}

/**
 * Generate a new quiz
 * POST /api/quiz/generate
 *
 * Expected payload (camelCase):
 * {
 *   studentId: string,
 *   schoolId: string,
 *   classNumber: number,
 *   subject: string,
 *   chapter: string,
 *   topic: string,
 *   difficulty?: string
 * }
 */
export const generateQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[QuizController] Received quiz generation request:', {
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    // Validate payload
    const validationErrors = validateQuizPayload(req.body);
    if (validationErrors.length > 0) {
      console.error('[QuizController] Validation failed:', validationErrors);
      res.status(400).json({
        error: 'Invalid request payload',
        validationErrors,
        hint: 'Expected camelCase payload with: studentId (string), schoolId (string), classNumber (number), subject (string), chapter (string), topic (string), difficulty? (string)',
      });
      return;
    }

    const { studentId, schoolId, classNumber, subject, chapter, topic } = req.body;

    console.log('[QuizController] Validation passed, calling QuizService.generateQuiz');

    // Convert camelCase API contract to internal snake_case format (boundary translation)
    const class_id = `class ${classNumber}`;

    const quizAttempt = await QuizService.generateQuiz({
      student_id: studentId.trim(),
      school_id: schoolId.trim(),
      class_id: class_id,
      subject: subject.trim(),
      chapter: chapter.trim(),
      topic: topic.trim(),
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

// ============================================================================
// V2 QUIZ API - REUSABLE QUIZ SETS (NEW SYSTEM)
// ============================================================================

/**
 * Generate quiz using reusable question sets (V2)
 * POST /api/quiz/v2/generate
 *
 * This endpoint implements quiz set reuse logic:
 * 1. Searches for existing quiz set matching: class, subject, chapter, topic, difficulty
 * 2. If found, returns existing set (efficient, no AI cost)
 * 3. If not found, generates new set via AI and saves for future reuse
 *
 * Expected payload (camelCase):
 * {
 *   studentId: string,
 *   schoolId: string,
 *   classNumber: number,
 *   classLabel: string,
 *   subject: string,
 *   chapter: string,
 *   topic: string,
 *   difficultyLabel?: string,  // "easy" | "medium" | "hard" | optional
 *   numQuestions?: number       // Default 10
 * }
 */
export const generateQuizV2 = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[QuizController V2] Received quiz generation request:', {
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    // Validate payload
    const validationErrors = validateQuizPayload(req.body);
    if (validationErrors.length > 0) {
      console.error('[QuizController V2] Validation failed:', validationErrors);
      res.status(400).json({
        error: 'Invalid request payload',
        validationErrors,
        hint: 'Expected camelCase payload with: studentId, schoolId, classNumber, classLabel, subject, chapter, topic, difficultyLabel? (optional)',
      });
      return;
    }

    const {
      studentId,
      schoolId,
      classNumber,
      classLabel,
      subject,
      chapter,
      topic,
      difficultyLabel,
      numQuestions = 10,
    } = req.body;

    console.log('[QuizController V2] Validation passed, preparing request for QuestionSetService');

    // Build request for QuestionSetService
    const request: GenerateQuizRequest = {
      student_id: studentId.trim(),
      school_id: schoolId.trim(),
      class_number: classNumber,
      class_label: classLabel || `Class ${classNumber}`,
      subject: subject.trim(),
      chapter: chapter.trim(),
      topic: topic.trim(),
      difficulty_label: difficultyLabel?.trim(),
      num_questions: numQuestions,
    };

    // Fetch chapter text (needed for AI generation if quiz set doesn't exist)
    const { SyllabusService } = await import('../services/syllabusService');
    const chapterText = await SyllabusService.getChapterText(
      classNumber,
      subject.trim(),
      chapter.trim()
    );

    if (!chapterText) {
      throw new Error(`No syllabus content found for class ${classNumber}, subject ${subject}, chapter ${chapter}`);
    }

    console.log('[QuizController V2] Calling QuestionSetService.findOrCreateQuizSet');

    // Find or create quiz set (core reuse logic)
    const { questionSet, is_new } = await QuestionSetService.findOrCreateQuizSet(request, chapterText);

    console.log('[QuizController V2] Quiz set obtained:', {
      set_id: questionSet.set_id,
      is_new_set: is_new,
      question_count: questionSet.questions.length,
    });

    // Don't send correct answers to frontend
    const questionsForFrontend = questionSet.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      skills: q.skills,
      features: q.features,
    }));

    res.status(201).json({
      set_id: questionSet.set_id,
      questions: questionsForFrontend,
      difficulty_level: questionSet.difficulty_level,
      difficulty_label: questionSet.difficulty_label,
      is_new_set: is_new,
      message: is_new
        ? 'New quiz set generated and saved for future reuse'
        : 'Existing quiz set retrieved from database',
    });
  } catch (error: any) {
    console.error('[QuizController V2] Error generating quiz:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
    });

    // Return specific error messages based on error type
    if (error.message?.includes('No syllabus')) {
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

    // Generic error fallback
    res.status(500).json({
      error: 'Failed to generate quiz',
      details: error.message || 'An unexpected error occurred',
    });
  }
};

/**
 * Submit quiz attempt (V2)
 * POST /api/quiz/v2/submit
 *
 * This endpoint stores student quiz attempts separately from quiz sets.
 * Multiple students can attempt the same quiz set, and each student can
 * attempt the same set multiple times.
 *
 * Expected payload:
 * {
 *   studentId: string,
 *   schoolId: string,
 *   setId: string,
 *   answers: [
 *     { questionId: string, selectedOptionIndex: number },
 *     ...
 *   ]
 * }
 */
export const submitQuizV2 = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[QuizController V2] Received quiz submission:', {
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    const { studentId, schoolId, setId, answers } = req.body;

    // Validate required fields
    if (!studentId || typeof studentId !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid field: studentId (must be a string)',
      });
      return;
    }

    if (!schoolId || typeof schoolId !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid field: schoolId (must be a string)',
      });
      return;
    }

    if (!setId || typeof setId !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid field: setId (must be a string)',
      });
      return;
    }

    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({
        error: 'Missing or invalid field: answers (must be an array)',
      });
      return;
    }

    console.log('[QuizController V2] Validation passed, calling QuestionSetService.submitQuizAttempt');

    // Build submission request
    const submitRequest: SubmitQuizRequest = {
      student_id: studentId.trim(),
      school_id: schoolId.trim(),
      set_id: setId.trim(),
      answers: answers.map((ans: any) => ({
        question_id: ans.questionId,
        selected_option_index: ans.selectedOptionIndex,
      })),
    };

    // Submit quiz attempt
    const result = await QuestionSetService.submitQuizAttempt(submitRequest);

    console.log('[QuizController V2] Quiz submitted successfully:', {
      attempt_id: result.attempt_id,
      score_percentage: result.score_percentage,
    });

    res.json({
      attemptId: result.attempt_id,
      scoreTotal: result.score_total,
      scorePercentage: result.score_percentage,
      correctCount: result.correct_count,
      incorrectCount: result.incorrect_count,
      totalQuestions: result.total_questions,
      featuresAggregated: result.features_aggregated,
      skillBreakdown: result.skill_breakdown,
    });
  } catch (error: any) {
    console.error('[QuizController V2] Error submitting quiz:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      error: 'Failed to submit quiz',
      details: error.message || 'An unexpected error occurred',
    });
  }
};
