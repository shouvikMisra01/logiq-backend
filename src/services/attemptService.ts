// src/services/attemptService.ts
/**
 * Attempt Service - Manages student question set attempts
 */

import { v4 as uuidv4 } from 'uuid';
import { collections } from '../config/database';
import type {
  QuestionSet,
  QuestionSetAttempt,
  QuestionAnswer,
  QuestionFeatures,
  SubmitQuizRequest,
} from '../types/questionSet';

export class AttemptService {
  /**
   * Calculate aggregated features based on student answers
   * Features are weighted by correctness (correct answers contribute more)
   */
  static calculateAggregatedFeatures(
    questionSet: QuestionSet,
    answers: Array<{ question_id: string; selected_option_index: number }>
  ): QuestionFeatures {
    let totalMemorization = 0;
    let totalReasoning = 0;
    let totalNumerical = 0;
    let totalLanguage = 0;
    let correctCount = 0;
    let totalQuestions = questionSet.questions.length;

    questionSet.questions.forEach((question) => {
      const answer = answers.find((a) => a.question_id === question.id);
      if (!answer) return;

      const isCorrect = answer.selected_option_index === question.correct_option_index;
      const weight = isCorrect ? 1.0 : 0.5; // Correct answers have higher weight

      totalMemorization += question.features.memorization * weight;
      totalReasoning += question.features.reasoning * weight;
      totalNumerical += question.features.numerical * weight;
      totalLanguage += question.features.language * weight;

      if (isCorrect) correctCount++;
    });

    // Normalize by dividing by total weighted count
    const totalWeight = correctCount * 1.0 + (totalQuestions - correctCount) * 0.5;

    return {
      memorization: totalMemorization / totalWeight,
      reasoning: totalReasoning / totalWeight,
      numerical: totalNumerical / totalWeight,
      language: totalLanguage / totalWeight,
    };
  }

  /**
   * Create a new question set attempt
   */
  static async createAttempt(
    request: SubmitQuizRequest,
    questionSet: QuestionSet
  ): Promise<QuestionSetAttempt> {
    const attemptsCol = collections.question_set_attempts();

    const attemptId = request.attempt_id || `attempt_${uuidv4().substring(0, 12)}`;

    // Build answers array with correctness
    const answers: QuestionAnswer[] = request.answers.map((answer) => {
      const question = questionSet.questions.find((q) => q.id === answer.question_id);
      const isCorrect = question
        ? answer.selected_option_index === question.correct_option_index
        : false;

      return {
        question_id: answer.question_id,
        selected_option_index: answer.selected_option_index,
        is_correct: isCorrect,
      };
    });

    // Calculate stats
    const correctCount = answers.filter((a) => a.is_correct).length;
    const incorrectCount = answers.length - correctCount;
    const scorePercentage = (correctCount / answers.length) * 100;

    // Calculate aggregated features
    const featuresAggregated = this.calculateAggregatedFeatures(
      questionSet,
      request.answers
    );

    const attempt: QuestionSetAttempt = {
      attempt_id: attemptId,
      student_id: request.student_id,
      school_id: request.school_id,
      set_id: request.set_id,
      class_number: questionSet.class_number,
      class_label: questionSet.class_label,
      subject: questionSet.subject,
      chapter: questionSet.chapter,
      topic: questionSet.topic,
      answers: answers,
      score_total: correctCount,
      score_percentage: scorePercentage,
      total_questions: answers.length,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      features_aggregated: featuresAggregated,
      submitted_at: new Date(),
    };

    await attemptsCol.insertOne(attempt);

    return attempt;
  }

  /**
   * Get all attempts for a student
   */
  static async getStudentAttempts(
    studentId: string,
    filters?: {
      subject?: string;
      chapter?: string;
      topic?: string;
      limit?: number;
    }
  ): Promise<QuestionSetAttempt[]> {
    const attemptsCol = collections.question_set_attempts();

    const query: any = { student_id: studentId };

    if (filters?.subject) query.subject = filters.subject;
    if (filters?.chapter) query.chapter = filters.chapter;
    if (filters?.topic) query.topic = filters.topic;

    const limit = filters?.limit || 50;

    const attempts = await attemptsCol
      .find(query)
      .sort({ submitted_at: -1 })
      .limit(limit)
      .toArray();

    return attempts as QuestionSetAttempt[];
  }

  /**
   * Get a specific attempt by ID
   */
  static async getAttemptById(attemptId: string): Promise<QuestionSetAttempt | null> {
    const attemptsCol = collections.question_set_attempts();

    const attempt = await attemptsCol.findOne({ attempt_id: attemptId });
    return attempt as QuestionSetAttempt | null;
  }

  /**
   * Get recent attempts for a student (for dashboard)
   */
  static async getRecentAttempts(
    studentId: string,
    limit: number = 10
  ): Promise<QuestionSetAttempt[]> {
    const attemptsCol = collections.question_set_attempts();

    const attempts = await attemptsCol
      .find({ student_id: studentId })
      .sort({ submitted_at: -1 })
      .limit(limit)
      .toArray();

    return attempts as QuestionSetAttempt[];
  }

  /**
   * Get attempts grouped by topic for analytics
   */
  static async getAttemptsByTopic(
    studentId: string,
    subject: string
  ): Promise<
    Array<{
      topic: string;
      attempts: number;
      avg_score: number;
      last_attempt: Date;
    }>
  > {
    const attemptsCol = collections.question_set_attempts();

    const pipeline = [
      {
        $match: {
          student_id: studentId,
          subject: subject,
        },
      },
      {
        $group: {
          _id: '$topic',
          attempts: { $sum: 1 },
          avg_score: { $avg: '$score_percentage' },
          last_attempt: { $max: '$submitted_at' },
        },
      },
      {
        $project: {
          _id: 0,
          topic: '$_id',
          attempts: 1,
          avg_score: 1,
          last_attempt: 1,
        },
      },
      {
        $sort: { last_attempt: -1 },
      },
    ];

    const results = await attemptsCol.aggregate(pipeline).toArray();
    return results as Array<{
      topic: string;
      attempts: number;
      avg_score: number;
      last_attempt: Date;
    }>;
  }

  /**
   * Delete an attempt (admin only)
   */
  static async deleteAttempt(attemptId: string): Promise<boolean> {
    const attemptsCol = collections.question_set_attempts();

    const result = await attemptsCol.deleteOne({ attempt_id: attemptId });
    return result.deletedCount === 1;
  }

  /**
   * Get total attempts count for a student
   */
  static async getAttemptCount(
    studentId: string,
    filters?: {
      subject?: string;
      topic?: string;
    }
  ): Promise<number> {
    const attemptsCol = collections.question_set_attempts();

    const query: any = { student_id: studentId };
    if (filters?.subject) query.subject = filters.subject;
    if (filters?.topic) query.topic = filters.topic;

    return await attemptsCol.countDocuments(query);
  }
}
