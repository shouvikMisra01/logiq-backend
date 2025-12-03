// src/services/skillStatsService.ts
/**
 * Skill Stats Service - Aggregates and manages student skill statistics
 */

import { collections } from '../config/database';
import type {
  StudentSkillStats,
  SkillScore,
  MasteryLevel,
  QuestionSet,
  QuestionSetAttempt,
  QuestionFeatures,
} from '../types/questionSet';

export class SkillStatsService {
  /**
   * Determine mastery level based on skill score
   */
  static getMasteryLevel(score: number): MasteryLevel {
    if (score < 0.4) return 'novice';
    if (score < 0.6) return 'learner';
    if (score < 0.8) return 'competent';
    return 'expert';
  }

  /**
   * Calculate skill scores from question set and attempt
   */
  static calculateSkillScores(
    questionSet: QuestionSet,
    attempt: QuestionSetAttempt
  ): SkillScore[] {
    const skillMap = new Map<
      string,
      { totalScore: number; questionsAnswered: number }
    >();

    // Iterate through each question and its answer
    questionSet.questions.forEach((question) => {
      const answer = attempt.answers.find((a) => a.question_id === question.id);
      if (!answer) return;

      // For each skill in this question
      question.skills.forEach((skillName) => {
        if (!skillMap.has(skillName)) {
          skillMap.set(skillName, { totalScore: 0, questionsAnswered: 0 });
        }

        const skillData = skillMap.get(skillName)!;
        skillData.questionsAnswered++;

        // If answer is correct, add to score (normalized 0-1)
        if (answer.is_correct) {
          skillData.totalScore += 1;
        }
      });
    });

    // Convert to SkillScore array
    const skillScores: SkillScore[] = [];
    skillMap.forEach((data, skillName) => {
      const score = data.totalScore / data.questionsAnswered;
      skillScores.push({
        skill_name: skillName,
        score: score,
        mastery_level: this.getMasteryLevel(score),
        questions_answered: data.questionsAnswered,
      });
    });

    return skillScores;
  }

  /**
   * Update or create student skill stats after an attempt
   */
  static async updateStudentStats(
    attempt: QuestionSetAttempt,
    questionSet: QuestionSet
  ): Promise<StudentSkillStats> {
    const statsCol = collections.student_skill_stats();

    // Find existing stats for this student + subject combination
    const existingStats = await statsCol.findOne({
      student_id: attempt.student_id,
      school_id: attempt.school_id,
      class_number: attempt.class_number,
      subject: attempt.subject,
      topic: { $exists: false }, // Subject-level stats (not topic-specific)
    });

    // Calculate new skill scores from this attempt
    const newSkillScores = this.calculateSkillScores(questionSet, attempt);

    if (existingStats) {
      // Merge with existing stats
      const updatedStats = this.mergeStats(
        existingStats as StudentSkillStats,
        attempt,
        newSkillScores
      );

      await statsCol.updateOne(
        {
          student_id: attempt.student_id,
          subject: attempt.subject,
          topic: { $exists: false },
        },
        { $set: updatedStats }
      );

      return updatedStats;
    } else {
      // Create new stats
      const newStats: StudentSkillStats = {
        student_id: attempt.student_id,
        school_id: attempt.school_id,
        class_number: attempt.class_number,
        subject: attempt.subject,
        total_questions_answered: attempt.total_questions,
        correct_count: attempt.correct_count,
        incorrect_count: attempt.incorrect_count,
        accuracy_percentage:
          (attempt.correct_count / attempt.total_questions) * 100,
        skills: newSkillScores,
        features_avg: attempt.features_aggregated,
        last_attempt_at: attempt.submitted_at,
        updated_at: new Date(),
      };

      await statsCol.insertOne(newStats);

      return newStats;
    }
  }

  /**
   * Merge existing stats with new attempt data
   */
  private static mergeStats(
    existingStats: StudentSkillStats,
    newAttempt: QuestionSetAttempt,
    newSkillScores: SkillScore[]
  ): StudentSkillStats {
    // Update question counts
    const totalQuestions =
      existingStats.total_questions_answered + newAttempt.total_questions;
    const totalCorrect = existingStats.correct_count + newAttempt.correct_count;
    const totalIncorrect =
      existingStats.incorrect_count + newAttempt.incorrect_count;

    // Merge skills using weighted average
    const mergedSkills = this.mergeSkills(existingStats.skills, newSkillScores);

    // Weighted average of features
    const oldWeight = existingStats.total_questions_answered;
    const newWeight = newAttempt.total_questions;
    const totalWeight = oldWeight + newWeight;

    const mergedFeatures: QuestionFeatures = {
      memorization:
        (existingStats.features_avg.memorization * oldWeight +
          newAttempt.features_aggregated.memorization * newWeight) /
        totalWeight,
      reasoning:
        (existingStats.features_avg.reasoning * oldWeight +
          newAttempt.features_aggregated.reasoning * newWeight) /
        totalWeight,
      numerical:
        (existingStats.features_avg.numerical * oldWeight +
          newAttempt.features_aggregated.numerical * newWeight) /
        totalWeight,
      language:
        (existingStats.features_avg.language * oldWeight +
          newAttempt.features_aggregated.language * newWeight) /
        totalWeight,
    };

    return {
      ...existingStats,
      total_questions_answered: totalQuestions,
      correct_count: totalCorrect,
      incorrect_count: totalIncorrect,
      accuracy_percentage: (totalCorrect / totalQuestions) * 100,
      skills: mergedSkills,
      features_avg: mergedFeatures,
      last_attempt_at: newAttempt.submitted_at,
      updated_at: new Date(),
    };
  }

  /**
   * Merge skill arrays using weighted average
   */
  private static mergeSkills(
    existingSkills: SkillScore[],
    newSkills: SkillScore[]
  ): SkillScore[] {
    const skillMap = new Map<string, SkillScore>();

    // Add existing skills
    existingSkills.forEach((skill) => {
      skillMap.set(skill.skill_name, { ...skill });
    });

    // Merge with new skills
    newSkills.forEach((newSkill) => {
      const existing = skillMap.get(newSkill.skill_name);

      if (existing) {
        // Weighted average
        const totalQuestions =
          existing.questions_answered + newSkill.questions_answered;
        const newScore =
          (existing.score * existing.questions_answered +
            newSkill.score * newSkill.questions_answered) /
          totalQuestions;

        skillMap.set(newSkill.skill_name, {
          skill_name: newSkill.skill_name,
          score: newScore,
          mastery_level: this.getMasteryLevel(newScore),
          questions_answered: totalQuestions,
        });
      } else {
        // New skill
        skillMap.set(newSkill.skill_name, newSkill);
      }
    });

    return Array.from(skillMap.values());
  }

  /**
   * Get student stats for a subject
   */
  static async getStudentStats(
    studentId: string,
    subject: string,
    topic?: string
  ): Promise<StudentSkillStats | null> {
    const statsCol = collections.student_skill_stats();

    const query: any = {
      student_id: studentId,
      subject: subject,
    };

    if (topic) {
      query.topic = topic;
    } else {
      query.topic = { $exists: false };
    }

    const stats = await statsCol.findOne(query);
    return stats as StudentSkillStats | null;
  }

  /**
   * Get all stats for a student across all subjects
   */
  static async getAllStudentStats(
    studentId: string
  ): Promise<StudentSkillStats[]> {
    const statsCol = collections.student_skill_stats();

    const stats = await statsCol
      .find({
        student_id: studentId,
        topic: { $exists: false }, // Only subject-level stats
      })
      .toArray();

    return stats as StudentSkillStats[];
  }

  /**
   * Get class-level aggregated stats (for teacher/admin dashboards)
   */
  static async getClassStats(
    schoolId: string,
    classNumber: number,
    subject: string
  ): Promise<{
    total_students: number;
    avg_accuracy: number;
    avg_skills: SkillScore[];
  }> {
    const statsCol = collections.student_skill_stats();

    const pipeline = [
      {
        $match: {
          school_id: schoolId,
          class_number: classNumber,
          subject: subject,
          topic: { $exists: false },
        },
      },
      {
        $group: {
          _id: null,
          total_students: { $sum: 1 },
          avg_accuracy: { $avg: '$accuracy_percentage' },
          all_skills: { $push: '$skills' },
        },
      },
    ];

    const results = await statsCol.aggregate(pipeline).toArray();

    if (results.length === 0) {
      return {
        total_students: 0,
        avg_accuracy: 0,
        avg_skills: [],
      };
    }

    const result = results[0] as any;

    // Aggregate skills across all students
    const skillMap = new Map<
      string,
      { totalScore: number; studentCount: number }
    >();

    result.all_skills.forEach((studentSkills: SkillScore[]) => {
      studentSkills.forEach((skill) => {
        if (!skillMap.has(skill.skill_name)) {
          skillMap.set(skill.skill_name, { totalScore: 0, studentCount: 0 });
        }

        const data = skillMap.get(skill.skill_name)!;
        data.totalScore += skill.score;
        data.studentCount++;
      });
    });

    const avgSkills: SkillScore[] = [];
    skillMap.forEach((data, skillName) => {
      const avgScore = data.totalScore / data.studentCount;
      avgSkills.push({
        skill_name: skillName,
        score: avgScore,
        mastery_level: this.getMasteryLevel(avgScore),
        questions_answered: 0, // Not applicable for class average
      });
    });

    return {
      total_students: result.total_students,
      avg_accuracy: result.avg_accuracy,
      avg_skills: avgSkills,
    };
  }

  /**
   * Delete student stats (admin only)
   */
  static async deleteStudentStats(
    studentId: string,
    subject?: string
  ): Promise<number> {
    const statsCol = collections.student_skill_stats();

    const query: any = { student_id: studentId };
    if (subject) query.subject = subject;

    const result = await statsCol.deleteMany(query);
    return result.deletedCount;
  }
}
