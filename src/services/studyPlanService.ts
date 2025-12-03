// src/services/studyPlanService.ts
/**
 * Study Plan Service
 */

import { collections } from '../config/database';
import { LLMService } from './llmService';
import { StudyPlan, StudyPlanRequest, QuizAttempt } from '../types/quiz';

export class StudyPlanService {
  /**
   * Generate a personalized study plan based on quiz history
   */
  static async generateStudyPlan(request: StudyPlanRequest): Promise<StudyPlan> {
    const { student_id, school_id } = request;

    // 1. Get quiz data from last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const quizCol = collections.quiz_attempts();
    const quizzes = (await quizCol
      .find({
        student_id,
        school_id,
        submitted_at: { $exists: true, $gte: sevenDaysAgo },
      })
      .toArray()) as QuizAttempt[];

    if (quizzes.length === 0) {
      throw new Error('No quiz data available in the last 7 days for this student');
    }

    // 2. Aggregate feature scores per subject
    const subjectData: Record<
      string,
      {
        count: number;
        sum: {
          memorization: number;
          reasoning: number;
          numerical: number;
          language: number;
        };
      }
    > = {};

    for (const quiz of quizzes) {
      if (!subjectData[quiz.subject]) {
        subjectData[quiz.subject] = {
          count: 0,
          sum: { memorization: 0, reasoning: 0, numerical: 0, language: 0 },
        };
      }

      subjectData[quiz.subject].count++;
      subjectData[quiz.subject].sum.memorization += quiz.feature_scores.memorization;
      subjectData[quiz.subject].sum.reasoning += quiz.feature_scores.reasoning;
      subjectData[quiz.subject].sum.numerical += quiz.feature_scores.numerical;
      subjectData[quiz.subject].sum.language += quiz.feature_scores.language;
    }

    // 3. Calculate average feature scores per subject
    const subjectFeatureMeans: Record<
      string,
      {
        memorization: number;
        reasoning: number;
        numerical: number;
        language: number;
      }
    > = {};

    for (const [subject, data] of Object.entries(subjectData)) {
      subjectFeatureMeans[subject] = {
        memorization: parseFloat((data.sum.memorization / data.count).toFixed(3)),
        reasoning: parseFloat((data.sum.reasoning / data.count).toFixed(3)),
        numerical: parseFloat((data.sum.numerical / data.count).toFixed(3)),
        language: parseFloat((data.sum.language / data.count).toFixed(3)),
      };
    }

    // 4. Generate study plan using LLM
    const plan = await LLMService.generateStudyPlan(student_id, subjectFeatureMeans);

    // 5. Calculate week start (Monday of current week)
    const week_start = this.getWeekStart(now);

    // 6. Save study plan to database
    const studyPlanCol = collections.study_plans();
    const studyPlan: Partial<StudyPlan> = {
      student_id,
      week_start,
      plan,
      created_at: now,
    };

    await studyPlanCol.insertOne(studyPlan);

    return studyPlan as StudyPlan;
  }

  /**
   * Get study plan for student
   */
  static async getStudyPlanForStudent(
    student_id: string,
    week_start?: Date
  ): Promise<StudyPlan | null> {
    const studyPlanCol = collections.study_plans();

    const query: any = { student_id };

    if (week_start) {
      // Get plan for specific week
      query.week_start = week_start;
    }

    // Get most recent plan
    const plan = await studyPlanCol.findOne(query, { sort: { created_at: -1 } });

    return plan as StudyPlan | null;
  }

  /**
   * Get all study plans for a student
   */
  static async getAllStudyPlansForStudent(student_id: string): Promise<StudyPlan[]> {
    const studyPlanCol = collections.study_plans();

    return (await studyPlanCol
      .find({ student_id })
      .sort({ created_at: -1 })
      .toArray()) as StudyPlan[];
  }

  /**
   * Get week start date (Monday of current week)
   */
  private static getWeekStart(date: Date): Date {
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday (0) or other days
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }
}
