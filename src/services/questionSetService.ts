// src/services/questionSetService.ts
/**
 * Question Set Service - Manages reusable question sets
 */

import { v4 as uuidv4 } from 'uuid';
import { collections } from '../config/database';
import type { QuestionSet, Question, GenerateQuizRequest } from '../types/questionSet';

export class QuestionSetService {
  /**
   * Find all question sets for a given topic
   */
  static async findSetsByTopic(
    classNumber: number,
    subject: string,
    chapter: string,
    topic: string
  ): Promise<QuestionSet[]> {
    const questionSetsCol = collections.question_sets();

    const sets = await questionSetsCol
      .find({
        class_number: classNumber,
        subject: subject,
        chapter: chapter,
        topic: topic,
      })
      .toArray();

    return sets as QuestionSet[];
  }

  /**
   * Find a specific question set by set_id
   */
  static async findSetById(setId: string): Promise<QuestionSet | null> {
    const questionSetsCol = collections.question_sets();

    const set = await questionSetsCol.findOne({ set_id: setId });
    return set as QuestionSet | null;
  }

  /**
   * Get all attempted set IDs for a student in a specific topic
   */
  static async getAttemptedSetIds(
    studentId: string,
    classNumber: number,
    subject: string,
    chapter: string,
    topic: string
  ): Promise<string[]> {
    const attemptsCol = collections.question_set_attempts();

    const attempts = await attemptsCol
      .find({
        student_id: studentId,
        class_number: classNumber,
        subject: subject,
        chapter: chapter,
        topic: topic,
      })
      .project({ set_id: 1 })
      .toArray();

    return attempts.map((a) => (a as any).set_id);
  }

  /**
   * Find an unattempted question set for a student
   * Returns null if all sets have been attempted
   */
  static async findUnattemptedSet(
    studentId: string,
    classNumber: number,
    subject: string,
    chapter: string,
    topic: string
  ): Promise<QuestionSet | null> {
    // Get all sets for this topic
    const allSets = await this.findSetsByTopic(classNumber, subject, chapter, topic);

    if (allSets.length === 0) {
      return null; // No sets exist at all
    }

    // Get attempted set IDs
    const attemptedSetIds = await this.getAttemptedSetIds(
      studentId,
      classNumber,
      subject,
      chapter,
      topic
    );

    // Filter to unattempted sets
    const unattemptedSets = allSets.filter(
      (set) => !attemptedSetIds.includes(set.set_id)
    );

    if (unattemptedSets.length === 0) {
      return null; // Student has attempted all sets
    }

    // Pick a random unattempted set (or you can pick oldest, newest, etc.)
    const randomIndex = Math.floor(Math.random() * unattemptedSets.length);
    return unattemptedSets[randomIndex];
  }

  /**
   * Create and save a new question set
   */
  static async createQuestionSet(
    request: GenerateQuizRequest,
    questions: Question[],
    difficultyLevel: number
  ): Promise<QuestionSet> {
    const questionSetsCol = collections.question_sets();

    const setId = `set_${uuidv4().substring(0, 12)}`;

    const questionSet: QuestionSet = {
      set_id: setId,
      class_number: request.class_number,
      class_label: request.class_label,
      subject: request.subject,
      chapter: request.chapter,
      topic: request.topic,
      questions: questions,
      difficulty_level: difficultyLevel,
      created_at: new Date(),
      created_by: request.student_id, // Track who triggered the generation
    };

    await questionSetsCol.insertOne(questionSet);

    return questionSet;
  }

  /**
   * Get statistics about question sets for a topic
   */
  static async getTopicSetStats(
    studentId: string,
    classNumber: number,
    subject: string,
    chapter: string,
    topic: string
  ): Promise<{
    total_sets: number;
    attempted_sets: number;
    unattempted_sets: number;
  }> {
    const allSets = await this.findSetsByTopic(classNumber, subject, chapter, topic);
    const attemptedSetIds = await this.getAttemptedSetIds(
      studentId,
      classNumber,
      subject,
      chapter,
      topic
    );

    return {
      total_sets: allSets.length,
      attempted_sets: attemptedSetIds.length,
      unattempted_sets: allSets.length - attemptedSetIds.length,
    };
  }

  /**
   * Delete a question set (admin only)
   */
  static async deleteQuestionSet(setId: string): Promise<boolean> {
    const questionSetsCol = collections.question_sets();

    const result = await questionSetsCol.deleteOne({ set_id: setId });
    return result.deletedCount === 1;
  }

  /**
   * Get all unique topics for a subject and class
   */
  static async getTopicsForSubject(
    classNumber: number,
    subject: string
  ): Promise<Array<{ chapter: string; topic: string; set_count: number }>> {
    const questionSetsCol = collections.question_sets();

    const pipeline = [
      {
        $match: {
          class_number: classNumber,
          subject: subject,
        },
      },
      {
        $group: {
          _id: { chapter: '$chapter', topic: '$topic' },
          set_count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          chapter: '$_id.chapter',
          topic: '$_id.topic',
          set_count: 1,
        },
      },
      {
        $sort: { chapter: 1, topic: 1 },
      },
    ];

    const results = await questionSetsCol.aggregate(pipeline).toArray();
    return results as Array<{ chapter: string; topic: string; set_count: number }>;
  }
}
