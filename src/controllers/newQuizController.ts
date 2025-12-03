// src/controllers/newQuizController.ts
/**
 * New Quiz Controller - Orchestrates question set generation and submission
 */

import { Request, Response } from 'express';
import { QuestionSetService } from '../services/questionSetService';
import { AttemptService } from '../services/attemptService';
import { SkillStatsService } from '../services/skillStatsService';
import { LLMService } from '../services/llmService';
import { SyllabusService } from '../services/syllabusService';
import type {
  GenerateQuizRequest,
  GenerateQuizResponse,
  SubmitQuizRequest,
  SubmitQuizResponse,
  Question,
} from '../types/questionSet';

/**
 * Generate questions using AI based on chapter text
 */
async function generateQuestionsWithAI(
  classNumber: number,
  classLabel: string,
  subject: string,
  chapter: string,
  topic: string,
  numQuestions: number
): Promise<{ questions: Question[]; difficulty_level: number }> {
  console.log(`[AI Generation] Starting for ${subject} > ${chapter} > ${topic}`);

  // 1. Get chapter text from syllabus
  const chapterText = await SyllabusService.getChapterText(
    classNumber,
    subject,
    chapter
  );

  if (!chapterText || chapterText.trim().length === 0) {
    throw new Error(
      `No content found for ${subject} > ${chapter}. Please ensure syllabus is uploaded.`
    );
  }

  console.log(`[AI Generation] Retrieved ${chapterText.length} chars of chapter text`);

  // 2. Generate questions using LLM
  const llmQuestions = await LLMService.generateQuestionsFromText(
    chapterText,
    classLabel,
    subject,
    chapter,
    classNumber
  );

  if (!llmQuestions || llmQuestions.length === 0) {
    throw new Error('AI generated 0 questions. Please try again.');
  }

  // 3. Convert to new Question format and calculate overall difficulty
  const questions: Question[] = llmQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correct_option_index: q.correct_option_index,
    skills: q.skills,
    features: {
      memorization: q.features.memorization,
      reasoning: q.features.reasoning,
      numerical: q.features.numerical,
      language: q.features.language,
    },
    difficulty_score: q.features.difficulty_score,
  }));

  // Calculate average difficulty for the set
  const avgDifficultyScore =
    questions.reduce((sum, q) => sum + q.difficulty_score, 0) / questions.length;

  // Convert to 1-5 scale for difficulty_level
  const difficulty_level = Math.max(1, Math.min(5, Math.round(avgDifficultyScore / 2)));

  console.log(
    `[AI Generation] Generated ${questions.length} questions with avg difficulty ${avgDifficultyScore.toFixed(2)} (level ${difficulty_level})`
  );

  return {
    questions,
    difficulty_level,
  };
}

export class NewQuizController {
  /**
   * Generate or retrieve a quiz for a student
   *
   * POST /api/quiz/generate
   * Body: { student_id, school_id, class_number, class_label, subject, chapter, topic, num_questions? }
   */
  static async generateQuiz(req: Request, res: Response): Promise<void | Response> {
    try {
      const request: GenerateQuizRequest = req.body;

      // Validate required fields
      if (
        !request.student_id ||
        !request.school_id ||
        !request.class_number ||
        !request.subject ||
        !request.chapter ||
        !request.topic
      ) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: [
            'student_id',
            'school_id',
            'class_number',
            'subject',
            'chapter',
            'topic',
          ],
        });
      }

      const numQuestions = request.num_questions || 10;

      // Step 1: Try to find an unattempted question set
      const unattemptedSet = await QuestionSetService.findUnattemptedSet(
        request.student_id,
        request.class_number,
        request.subject,
        request.chapter,
        request.topic
      );

      if (unattemptedSet) {
        // Return existing unattempted set
        const response: GenerateQuizResponse = {
          set_id: unattemptedSet.set_id,
          questions: unattemptedSet.questions,
          difficulty_level: unattemptedSet.difficulty_level,
          is_new_set: false,
          message: 'Returning an existing question set you have not attempted yet',
        };

        return res.json(response);
      }

      // Step 2: All sets attempted (or no sets exist), generate a new one
      console.log(`Generating new AI question set for ${request.topic}...`);

      const { questions, difficulty_level } = await generateQuestionsWithAI(
        request.class_number,
        request.class_label,
        request.subject,
        request.chapter,
        request.topic,
        numQuestions
      );

      // Step 3: Save the new question set
      const newSet = await QuestionSetService.createQuestionSet(
        request,
        questions,
        difficulty_level
      );

      const response: GenerateQuizResponse = {
        set_id: newSet.set_id,
        questions: newSet.questions,
        difficulty_level: newSet.difficulty_level,
        is_new_set: true,
        message: 'Generated a new AI question set',
      };

      res.json(response);
    } catch (error: any) {
      console.error('[NewQuizController] Generate error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate quiz' });
    }
  }

  /**
   * Submit quiz answers and record attempt
   *
   * POST /api/quiz/submit
   * Body: { student_id, school_id, set_id, answers: [{ question_id, selected_option_index }] }
   */
  static async submitQuiz(req: Request, res: Response): Promise<void | Response> {
    try {
      const request: SubmitQuizRequest = req.body;

      // Validate required fields
      if (
        !request.student_id ||
        !request.school_id ||
        !request.set_id ||
        !request.answers ||
        request.answers.length === 0
      ) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['student_id', 'school_id', 'set_id', 'answers'],
        });
      }

      // Step 1: Fetch the question set
      const questionSet = await QuestionSetService.findSetById(request.set_id);

      if (!questionSet) {
        return res.status(404).json({ error: 'Question set not found' });
      }

      // Step 2: Create the attempt record
      const attempt = await AttemptService.createAttempt(request, questionSet);

      // Step 3: Update student skill stats
      const updatedStats = await SkillStatsService.updateStudentStats(
        attempt,
        questionSet
      );

      // Step 4: Build response
      const response: SubmitQuizResponse = {
        attempt_id: attempt.attempt_id,
        score_total: attempt.score_total,
        score_percentage: attempt.score_percentage,
        correct_count: attempt.correct_count,
        incorrect_count: attempt.incorrect_count,
        total_questions: attempt.total_questions,
        features_aggregated: attempt.features_aggregated,
        skill_breakdown: updatedStats.skills,
      };

      res.json(response);
    } catch (error: any) {
      console.error('[NewQuizController] Submit error:', error);
      res.status(500).json({ error: error.message || 'Failed to submit quiz' });
    }
  }

  /**
   * Get student's quiz history
   *
   * GET /api/quiz/history/:student_id?subject=...&topic=...&limit=...
   */
  static async getQuizHistory(req: Request, res: Response): Promise<void | Response> {
    try {
      const studentId = req.params.student_id;
      const subject = req.query.subject as string | undefined;
      const topic = req.query.topic as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      const attempts = await AttemptService.getStudentAttempts(studentId, {
        subject,
        topic,
        limit,
      });

      res.json({ attempts, count: attempts.length });
    } catch (error: any) {
      console.error('[NewQuizController] History error:', error);
      res.status(500).json({ error: error.message || 'Failed to get quiz history' });
    }
  }

  /**
   * Get student skill statistics
   *
   * GET /api/quiz/stats/:student_id/:subject
   */
  static async getStudentStats(req: Request, res: Response): Promise<void | Response> {
    try {
      const studentId = req.params.student_id;
      const subject = req.params.subject;
      const topic = req.query.topic as string | undefined;

      const stats = await SkillStatsService.getStudentStats(
        studentId,
        subject,
        topic
      );

      if (!stats) {
        return res.status(404).json({
          error: 'No statistics found for this student and subject',
        });
      }

      res.json(stats);
    } catch (error: any) {
      console.error('[NewQuizController] Stats error:', error);
      res.status(500).json({ error: error.message || 'Failed to get student stats' });
    }
  }

  /**
   * Get all student stats across subjects
   *
   * GET /api/quiz/stats/:student_id
   */
  static async getAllStudentStats(req: Request, res: Response): Promise<void | Response> {
    try {
      const studentId = req.params.student_id;

      const allStats = await SkillStatsService.getAllStudentStats(studentId);

      res.json({ stats: allStats, count: allStats.length });
    } catch (error: any) {
      console.error('[NewQuizController] All stats error:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to get all student stats' });
    }
  }

  /**
   * Get topic performance overview
   *
   * GET /api/quiz/topics/:student_id/:subject
   */
  static async getTopicPerformance(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const studentId = req.params.student_id;
      const subject = req.params.subject;

      const topicPerformance = await AttemptService.getAttemptsByTopic(
        studentId,
        subject
      );

      res.json({ topics: topicPerformance, count: topicPerformance.length });
    } catch (error: any) {
      console.error('[NewQuizController] Topic performance error:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to get topic performance' });
    }
  }

  /**
   * Get class-level statistics (for teachers/admins)
   *
   * GET /api/quiz/class-stats/:school_id/:class_number/:subject
   */
  static async getClassStats(req: Request, res: Response): Promise<void | Response> {
    try {
      const schoolId = req.params.school_id;
      const classNumber = parseInt(req.params.class_number);
      const subject = req.params.subject;

      const classStats = await SkillStatsService.getClassStats(
        schoolId,
        classNumber,
        subject
      );

      res.json(classStats);
    } catch (error: any) {
      console.error('[NewQuizController] Class stats error:', error);
      res.status(500).json({ error: error.message || 'Failed to get class stats' });
    }
  }

  /**
   * Get detailed attempt by ID
   *
   * GET /api/quiz/attempt/:attempt_id
   */
  static async getAttemptDetails(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const attemptId = req.params.attempt_id;

      const attempt = await AttemptService.getAttemptById(attemptId);

      if (!attempt) {
        return res.status(404).json({ error: 'Attempt not found' });
      }

      // Also fetch the question set for full details
      const questionSet = await QuestionSetService.findSetById(attempt.set_id);

      res.json({
        attempt,
        question_set: questionSet,
      });
    } catch (error: any) {
      console.error('[NewQuizController] Attempt details error:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to get attempt details' });
    }
  }
}
