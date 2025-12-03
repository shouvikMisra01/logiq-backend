// src/services/quizMonitoringService.ts
/**
 * Quiz Monitoring Service - Track metrics for Quiz V2
 */

import { collections } from '../config/database';

export interface QuizMetrics {
  total_sets_generated: number;
  total_sets_reused: number;
  reuse_rate_percentage: number;
  total_attempts: number;
  total_students: number;
  avg_questions_per_student: number;
  avg_accuracy_percentage: number;
  top_subjects: Array<{
    subject: string;
    total_sets: number;
    total_attempts: number;
  }>;
}

export class QuizMonitoringService {
  /**
   * Get overall quiz system metrics
   */
  static async getSystemMetrics(
    schoolId?: string,
    dateFrom?: Date
  ): Promise<QuizMetrics> {
    const questionSetsCol = collections.question_sets();
    const attemptsCol = collections.question_set_attempts();
    const statsCol = collections.student_skill_stats();

    // Build query filters
    const dateFilter = dateFrom ? { created_at: { $gte: dateFrom } } : {};
    const schoolFilter = schoolId ? { school_id: schoolId } : {};

    // Total sets generated
    const totalSets = await questionSetsCol.countDocuments(dateFilter);

    // Total attempts
    const totalAttempts = await attemptsCol.countDocuments({
      ...schoolFilter,
      submitted_at: { $exists: true },
      ...(dateFrom ? { submitted_at: { $gte: dateFrom } } : {}),
    });

    // Calculate reuse metrics
    // Each set can be attempted by multiple students
    // Reuse rate = (total_attempts - total_sets) / total_attempts
    const reuseRate =
      totalAttempts > 0 ? ((totalAttempts - totalSets) / totalAttempts) * 100 : 0;

    // Total students with stats
    const totalStudents = await statsCol.countDocuments(schoolFilter);

    // Average questions per student
    const statsResults = await statsCol
      .aggregate([
        { $match: schoolFilter },
        {
          $group: {
            _id: null,
            avgQuestions: { $avg: '$total_questions_answered' },
            avgAccuracy: { $avg: '$accuracy_percentage' },
          },
        },
      ])
      .toArray();

    const avgQuestions = statsResults[0]?.avgQuestions || 0;
    const avgAccuracy = statsResults[0]?.avgAccuracy || 0;

    // Top subjects by activity
    const topSubjects = await attemptsCol
      .aggregate([
        { $match: { ...schoolFilter, submitted_at: { $exists: true } } },
        {
          $group: {
            _id: '$subject',
            total_attempts: { $sum: 1 },
            unique_sets: { $addToSet: '$set_id' },
          },
        },
        {
          $project: {
            subject: '$_id',
            total_attempts: 1,
            total_sets: { $size: '$unique_sets' },
            _id: 0,
          },
        },
        { $sort: { total_attempts: -1 } },
        { $limit: 5 },
      ])
      .toArray();

    return {
      total_sets_generated: totalSets,
      total_sets_reused: Math.max(0, totalAttempts - totalSets),
      reuse_rate_percentage: reuseRate,
      total_attempts: totalAttempts,
      total_students: totalStudents,
      avg_questions_per_student: avgQuestions,
      avg_accuracy_percentage: avgAccuracy,
      top_subjects: topSubjects as Array<{
        subject: string;
        total_sets: number;
        total_attempts: number;
      }>,
    };
  }

  /**
   * Get set reuse statistics for a specific topic
   */
  static async getTopicReuseStats(
    classNumber: number,
    subject: string,
    chapter: string,
    topic: string
  ): Promise<{
    total_sets: number;
    total_students_attempted: number;
    total_attempts: number;
    reuse_rate: number;
  }> {
    const questionSetsCol = collections.question_sets();
    const attemptsCol = collections.question_set_attempts();

    const topicFilter = { class_number: classNumber, subject, chapter, topic };

    // Total sets for this topic
    const totalSets = await questionSetsCol.countDocuments(topicFilter);

    // Total attempts for this topic
    const totalAttempts = await attemptsCol.countDocuments(topicFilter);

    // Unique students who attempted this topic
    const uniqueStudents = await attemptsCol.distinct('student_id', topicFilter);

    const reuseRate =
      totalAttempts > 0 ? ((totalAttempts - totalSets) / totalAttempts) * 100 : 0;

    return {
      total_sets: totalSets,
      total_students_attempted: uniqueStudents.length,
      total_attempts: totalAttempts,
      reuse_rate: reuseRate,
    };
  }

  /**
   * Get daily generation and reuse statistics
   */
  static async getDailyStats(
    schoolId: string,
    daysBack: number = 7
  ): Promise<
    Array<{
      date: string;
      sets_generated: number;
      attempts: number;
      unique_students: number;
    }>
  > {
    const attemptsCol = collections.question_set_attempts();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const results = await attemptsCol
      .aggregate([
        {
          $match: {
            school_id: schoolId,
            submitted_at: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$submitted_at' },
            },
            attempts: { $sum: 1 },
            unique_students: { $addToSet: '$student_id' },
            unique_sets: { $addToSet: '$set_id' },
          },
        },
        {
          $project: {
            date: '$_id',
            sets_generated: { $size: '$unique_sets' },
            attempts: 1,
            unique_students: { $size: '$unique_students' },
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ])
      .toArray();

    return results as Array<{
      date: string;
      sets_generated: number;
      attempts: number;
      unique_students: number;
    }>;
  }

  /**
   * Log a quiz generation event (for analytics)
   */
  static async logGeneration(
    setId: string,
    studentId: string,
    subject: string,
    topic: string,
    isNewSet: boolean
  ): Promise<void> {
    console.log('[QuizMonitoring] Quiz generated:', {
      set_id: setId,
      student_id: studentId,
      subject,
      topic,
      is_new_set: isNewSet,
      reused: !isNewSet,
      timestamp: new Date().toISOString(),
    });

    // You can optionally store this in a separate analytics collection
    // for detailed tracking and reporting
  }

  /**
   * Get efficiency report showing cost savings from reuse
   */
  static async getEfficiencyReport(
    schoolId: string
  ): Promise<{
    total_ai_generations: number;
    total_quiz_deliveries: number;
    sets_reused_count: number;
    estimated_cost_savings_percentage: number;
    avg_reuse_per_set: number;
  }> {
    const questionSetsCol = collections.question_sets();
    const attemptsCol = collections.question_set_attempts();

    const schoolFilter = schoolId ? { school_id: schoolId } : {};

    // Total AI generations (= total sets created)
    const totalGenerated = await questionSetsCol.countDocuments({});

    // Total quiz deliveries (= total attempts)
    const totalDelivered = await attemptsCol.countDocuments(schoolFilter);

    // Sets reused = deliveries - generations
    const setsReused = Math.max(0, totalDelivered - totalGenerated);

    // Cost savings = (reused / delivered) * 100
    const costSavings = totalDelivered > 0 ? (setsReused / totalDelivered) * 100 : 0;

    // Average reuse per set
    const avgReuse = totalGenerated > 0 ? totalDelivered / totalGenerated : 0;

    return {
      total_ai_generations: totalGenerated,
      total_quiz_deliveries: totalDelivered,
      sets_reused_count: setsReused,
      estimated_cost_savings_percentage: costSavings,
      avg_reuse_per_set: avgReuse,
    };
  }
}
