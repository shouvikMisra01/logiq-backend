// src/services/quizService.ts
/**
 * Quiz Service - Main business logic for quiz operations
 */

import { v4 as uuidv4 } from 'uuid';
import { collections } from '../config/database';
import { LLMService } from './llmService';
import { SyllabusService } from './syllabusService';
import {
  QuizAttempt,
  Question,
  QuizGenerateRequest,
  QuizSubmitRequest,
  QuizSubmitResult,
  FeatureScores,
} from '../types/quiz';

export class QuizService {
  /**
   * Generate a new quiz from PDF content
   */
  static async generateQuiz(request: QuizGenerateRequest): Promise<QuizAttempt> {
    const { student_id, school_id, class_id, subject, chapter } = request;

    console.log('[QuizService] generateQuiz called:', {
      student_id,
      school_id,
      class_id,
      subject,
      chapter,
    });

    try {
      // Database collection validation
      const quizCol = collections.quiz_attempts();
      if (!quizCol) {
        const errMsg = 'Quiz attempts collection is not initialized';
        console.error('[QuizService]', errMsg);
        throw new Error(errMsg);
      }

      // 1. Check for incomplete quizzes
      console.log('[QuizService] Checking for incomplete quizzes');
      let incompleteQuizzes;
      try {
        incompleteQuizzes = await quizCol
          .find({
            student_id,
            school_id,
            class_id,
            subject,
            chapter,
            submitted_at: { $exists: false }, // Not submitted
          })
          .sort({ created_at: 1 }) // Oldest first
          .toArray();
      } catch (dbError: any) {
        console.error('[QuizService] Database error fetching incomplete quizzes:', dbError.message);
        throw new Error(`Database error: Failed to check incomplete quizzes: ${dbError.message}`);
      }

      // If 5 or more incomplete quizzes, return the oldest one to complete
      if (incompleteQuizzes.length >= 5) {
        const oldestIncomplete = incompleteQuizzes[0] as QuizAttempt;

        console.log(
          `[QuizService] Found ${incompleteQuizzes.length} incomplete quizzes. Returning oldest incomplete quiz: ${oldestIncomplete.quiz_id}`
        );

        // Return the incomplete quiz with a flag indicating it's not new
        return {
          ...oldestIncomplete,
          _isIncomplete: true, // Special flag to indicate this is an incomplete quiz
          _incompleteCount: incompleteQuizzes.length,
        } as any;
      }

      // Validate class ID and extract class number
      console.log('[QuizService] Validating class ID:', class_id);
      const classNumber = parseInt(class_id.replace(/\D/g, ''), 10);

      if (isNaN(classNumber) || classNumber < 1 || classNumber > 12) {
        const errMsg = `Invalid class number: ${classNumber}. Must be between 1 and 12`;
        console.error('[QuizService]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[QuizService] Class number validated:', classNumber);

      // 2. Extract text from PDF using new Syllabus system
      console.log('[QuizService] Fetching chapter text from syllabus');
      let chapterText;
      try {
        chapterText = await SyllabusService.getChapterText(classNumber, subject, chapter);
      } catch (syllabusError: any) {
        console.error('[QuizService] Syllabus service error:', syllabusError.message);
        throw new Error(`Failed to get chapter text: ${syllabusError.message}`);
      }

      // 3. Generate questions using LLM
      console.log('[QuizService] Generating questions using LLM');
      let questions;
      try {
        questions = await LLMService.generateQuestionsFromText(
          chapterText,
          class_id,
          subject,
          chapter,
          classNumber
        );
      } catch (llmError: any) {
        console.error('[QuizService] LLM service error:', llmError.message);
        throw new Error(`Failed to generate questions: ${llmError.message}`);
      }

      if (!questions || questions.length === 0) {
        const errMsg = 'No questions were generated';
        console.error('[QuizService]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[QuizService] Questions generated successfully:', questions.length);

      // 4. Calculate quiz index for this student & chapter (for tracking)
      console.log('[QuizService] Calculating quiz index');
      let allQuizzes;
      try {
        allQuizzes = await quizCol
          .find({
            student_id,
            school_id,
            class_id,
            subject,
            chapter,
          })
          .toArray();
      } catch (dbError: any) {
        console.error('[QuizService] Database error fetching all quizzes:', dbError.message);
        throw new Error(`Database error: Failed to fetch quiz history: ${dbError.message}`);
      }

      const quiz_index = allQuizzes.length + 1;
      console.log('[QuizService] Quiz index:', quiz_index);

      // 5. Calculate average difficulty
      const avgDifficulty =
        questions.reduce((sum, q) => sum + q.features.difficulty_score, 0) / questions.length;

      const difficulty_level = LLMService.difficultyToLevel(avgDifficulty);
      console.log('[QuizService] Difficulty calculated:', {
        average: avgDifficulty,
        level: difficulty_level,
      });

      // 6. Get current week number
      const now = new Date();
      const week_number = this.getWeekNumber(now);

      // 7. Create quiz attempt
      const quiz_id = `quiz_${uuidv4().substring(0, 12)}`;

      const quizAttempt: Partial<QuizAttempt> = {
        quiz_id,
        student_id,
        school_id,
        class_id,
        subject,
        chapter,
        quiz_index,
        week_number,
        questions,
        score_total: 0,
        feature_scores: {
          memorization: 0,
          reasoning: 0,
          numerical: 0,
          language: 0,
        },
        difficulty_avg: avgDifficulty,
        difficulty_level,
        created_at: now,
      };

      console.log('[QuizService] Inserting quiz attempt into database:', quiz_id);
      try {
        await quizCol.insertOne(quizAttempt);
      } catch (dbError: any) {
        console.error('[QuizService] Database error inserting quiz attempt:', dbError.message);
        throw new Error(`Database error: Failed to create quiz: ${dbError.message}`);
      }

      console.log('[QuizService] Quiz generated successfully:', quiz_id);
      return quizAttempt as QuizAttempt;
    } catch (error: any) {
      console.error('[QuizService] Fatal error in generateQuiz:', error.message);
      throw new Error(`Failed to generate quiz: ${error.message}`);
    }
  }

  /**
   * Submit quiz answers and calculate scores
   */
  static async submitQuiz(request: QuizSubmitRequest): Promise<QuizSubmitResult> {
    const { quiz_id, answers } = request;

    console.log('[QuizService] submitQuiz called:', {
      quiz_id,
      answerCount: answers?.length,
    });

    try {
      // Database collection validation
      const quizCol = collections.quiz_attempts();
      if (!quizCol) {
        const errMsg = 'Quiz attempts collection is not initialized';
        console.error('[QuizService]', errMsg);
        throw new Error(errMsg);
      }

      // 1. Find the quiz attempt
      console.log('[QuizService] Fetching quiz:', quiz_id);
      let quizAttempt;
      try {
        quizAttempt = await quizCol.findOne({ quiz_id });
      } catch (dbError: any) {
        console.error('[QuizService] Database error fetching quiz:', dbError.message);
        throw new Error(`Database error: Failed to fetch quiz: ${dbError.message}`);
      }

      if (!quizAttempt) {
        const errMsg = `Quiz not found: ${quiz_id}`;
        console.error('[QuizService]', errMsg);
        throw new Error(errMsg);
      }

      if (quizAttempt.submitted_at) {
        const errMsg = `Quiz already submitted: ${quiz_id}`;
        console.error('[QuizService]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[QuizService] Quiz found, processing answers');

      // Input validation
      if (!answers || !Array.isArray(answers)) {
        const errMsg = 'Answers must be an array';
        console.error('[QuizService]', errMsg);
        throw new Error(errMsg);
      }

      // 2. Build answer map
      const answerMap: Record<string, number> = {};
      for (const ans of answers) {
        if (!ans.question_id || typeof ans.chosen_index !== 'number') {
          console.warn('[QuizService] Invalid answer structure:', ans);
          continue;
        }
        answerMap[ans.question_id] = ans.chosen_index;
      }

      console.log('[QuizService] Answer map created:', Object.keys(answerMap).length, 'answers');

      // 3. Calculate total score
      const questions: Question[] = quizAttempt.questions;
      if (!questions || questions.length === 0) {
        const errMsg = 'Quiz has no questions';
        console.error('[QuizService]', errMsg);
        throw new Error(errMsg);
      }

      let correct_count = 0;

      for (const q of questions) {
        if (answerMap[q.id] !== undefined && answerMap[q.id] === q.correct_option_index) {
          correct_count++;
        }
      }

      const total_questions = questions.length;
      const score_total = total_questions > 0 ? correct_count / total_questions : 0;

      console.log('[QuizService] Score calculated:', {
        correct: correct_count,
        total: total_questions,
        score: score_total,
      });

      // 4. Calculate feature scores
      const feature_scores = this.computeFeatureScores(questions, answerMap);
      console.log('[QuizService] Feature scores calculated:', feature_scores);

      // 5. Update quiz attempt
      console.log('[QuizService] Updating quiz submission');
      try {
        const updateResult = await quizCol.updateOne(
          { quiz_id },
          {
            $set: {
              answers: answerMap,
              score_total,
              feature_scores,
              submitted_at: new Date(),
            },
          }
        );

        if (updateResult.modifiedCount === 0) {
          console.warn('[QuizService] Quiz update affected 0 documents');
        }
      } catch (dbError: any) {
        console.error('[QuizService] Database error updating quiz:', dbError.message);
        throw new Error(`Database error: Failed to submit quiz: ${dbError.message}`);
      }

      console.log('[QuizService] Quiz submitted successfully');
      return {
        score_total,
        feature_scores,
        difficulty_level: quizAttempt.difficulty_level,
        correct_count,
        total_questions,
      };
    } catch (error: any) {
      console.error('[QuizService] Fatal error in submitQuiz:', error.message);
      throw new Error(`Failed to submit quiz: ${error.message}`);
    }
  }

  /**
   * Get quiz by ID
   */
  static async getQuizById(quiz_id: string): Promise<QuizAttempt | null> {
    const quizCol = collections.quiz_attempts();
    return (await quizCol.findOne({ quiz_id })) as QuizAttempt | null;
  }

  /**
   * Get all quizzes for a student
   */
  static async getQuizzesForStudent(
    student_id: string,
    school_id?: string,
    filters?: {
      subject?: string;
      chapter?: string;
      submitted?: boolean;
    }
  ): Promise<QuizAttempt[]> {
    const quizCol = collections.quiz_attempts();

    const query: any = { student_id };
    if (school_id) query.school_id = school_id;
    if (filters?.subject) query.subject = filters.subject;
    if (filters?.chapter) query.chapter = filters.chapter;
    if (filters?.submitted !== undefined) {
      query.submitted_at = filters.submitted ? { $exists: true } : { $exists: false };
    }

    return (await quizCol.find(query).sort({ created_at: -1 }).toArray()) as QuizAttempt[];
  }

  /**
   * Get quiz statistics for a student
   */
  static async getStudentStats(student_id: string, school_id?: string): Promise<any> {
    const quizCol = collections.quiz_attempts();

    const query: any = { student_id, submitted_at: { $exists: true } };
    if (school_id) query.school_id = school_id;

    const quizzes = (await quizCol.find(query).toArray()) as QuizAttempt[];

    if (quizzes.length === 0) {
      return {
        total_quizzes: 0,
        average_score: 0,
        feature_scores: {
          memorization: 0,
          reasoning: 0,
          numerical: 0,
          language: 0,
        },
        subjects: {},
      };
    }

    // Calculate averages
    const totalScore = quizzes.reduce((sum, q) => sum + q.score_total, 0);
    const avgScore = totalScore / quizzes.length;

    const featureSum = {
      memorization: 0,
      reasoning: 0,
      numerical: 0,
      language: 0,
    };

    for (const q of quizzes) {
      featureSum.memorization += q.feature_scores.memorization;
      featureSum.reasoning += q.feature_scores.reasoning;
      featureSum.numerical += q.feature_scores.numerical;
      featureSum.language += q.feature_scores.language;
    }

    const avgFeatures = {
      memorization: featureSum.memorization / quizzes.length,
      reasoning: featureSum.reasoning / quizzes.length,
      numerical: featureSum.numerical / quizzes.length,
      language: featureSum.language / quizzes.length,
    };

    // Group by subject
    const subjectStats: Record<string, any> = {};
    for (const q of quizzes) {
      if (!subjectStats[q.subject]) {
        subjectStats[q.subject] = {
          total_quizzes: 0,
          scores: [],
          features: { memorization: [], reasoning: [], numerical: [], language: [] },
        };
      }

      subjectStats[q.subject].total_quizzes++;
      subjectStats[q.subject].scores.push(q.score_total);
      subjectStats[q.subject].features.memorization.push(q.feature_scores.memorization);
      subjectStats[q.subject].features.reasoning.push(q.feature_scores.reasoning);
      subjectStats[q.subject].features.numerical.push(q.feature_scores.numerical);
      subjectStats[q.subject].features.language.push(q.feature_scores.language);
    }

    // Calculate subject averages
    const subjects: Record<string, any> = {};
    for (const [subject, stats] of Object.entries(subjectStats)) {
      const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

      subjects[subject] = {
        total_quizzes: stats.total_quizzes,
        average_score: avg(stats.scores),
        features: {
          memorization: avg(stats.features.memorization),
          reasoning: avg(stats.features.reasoning),
          numerical: avg(stats.features.numerical),
          language: avg(stats.features.language),
        },
      };
    }

    return {
      total_quizzes: quizzes.length,
      average_score: avgScore,
      feature_scores: avgFeatures,
      subjects,
    };
  }

  /**
   * Compute feature scores based on correct answers
   */
  private static computeFeatureScores(
    questions: Question[],
    answers: Record<string, number>
  ): FeatureScores {
    const totals = { memorization: 0, reasoning: 0, numerical: 0, language: 0 };
    const gained = { memorization: 0, reasoning: 0, numerical: 0, language: 0 };

    for (const q of questions) {
      const features = q.features;
      const isCorrect =
        answers[q.id] !== undefined && answers[q.id] === q.correct_option_index;

      totals.memorization += features.memorization;
      totals.reasoning += features.reasoning;
      totals.numerical += features.numerical;
      totals.language += features.language;

      if (isCorrect) {
        gained.memorization += features.memorization;
        gained.reasoning += features.reasoning;
        gained.numerical += features.numerical;
        gained.language += features.language;
      }
    }

    return {
      memorization: totals.memorization > 0 ? gained.memorization / totals.memorization : 0,
      reasoning: totals.reasoning > 0 ? gained.reasoning / totals.reasoning : 0,
      numerical: totals.numerical > 0 ? gained.numerical / totals.numerical : 0,
      language: totals.language > 0 ? gained.language / totals.language : 0,
    };
  }

  /**
   * Get week number of the year
   */
  private static getWeekNumber(date: Date): number {
    const oneJan = new Date(date.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  }
}
