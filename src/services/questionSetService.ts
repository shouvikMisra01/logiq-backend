// src/services/questionSetService.ts
/**
 * Question Set Service - Manages reusable question sets
 */

import { v4 as uuidv4 } from 'uuid';
import { collections } from '../config/database';
import type {
  QuestionSet,
  Question,
  GenerateQuizRequest,
  QuestionFeatures,
  SubmitQuizRequest,
  SubmitQuizResponse,
  QuestionSetAttempt,
  QuestionAnswer,
  SkillScore,
  MasteryLevel
} from '../types/questionSet';
import type { Question as OldQuestion } from '../types/quiz';

export class QuestionSetService {
  /**
   * Convert old Question format to new Question format
   * Old format: features contains difficulty_score
   * New format: difficulty_score is separate + features has only 4 scores
   */
  private static convertOldQuestionToNew(oldQuestion: OldQuestion): Question {
    // Extract feature scores from old QuestionFeatures (which extends FeatureScores)
    const features: QuestionFeatures = {
      memorization: oldQuestion.features.memorization || 0,
      reasoning: oldQuestion.features.reasoning || 0,
      numerical: oldQuestion.features.numerical || 0,
      language: oldQuestion.features.language || 0,
    };

    // Extract difficulty_score from old features
    const difficulty_score = oldQuestion.features.difficulty_score || 0.5;

    return {
      id: oldQuestion.id,
      question: oldQuestion.question,
      options: oldQuestion.options,
      correct_option_index: oldQuestion.correct_option_index,
      skills: oldQuestion.skills,
      features: features,
      difficulty_score: difficulty_score,
    };
  }

  /**
   * 🎯 CORE REUSE LOGIC: Find existing quiz set or return null
   * Matches by class, subject, chapter, topic, and optionally difficulty
   */
  static async findExistingQuizSet(
    classNumber: number,
    subject: string,
    chapter: string,
    topic: string,
    difficultyLabel?: string
  ): Promise<QuestionSet | null> {
    const questionSetsCol = collections.question_sets();

    const query: any = {
      class_number: classNumber,
      subject: subject.toLowerCase(),
      chapter: chapter,
      topic: topic,
    };

    // If difficulty specified, match it; otherwise match sets without difficulty
    if (difficultyLabel) {
      query.difficulty_label = difficultyLabel.toLowerCase();
    } else {
      // Match sets with no difficulty_label or "medium" as default
      query.$or = [
        { difficulty_label: { $exists: false } },
        { difficulty_label: null },
        { difficulty_label: 'medium' }
      ];
    }

    console.log('[QuestionSetService] Searching for existing quiz set:', query);

    // Return the most recently created set that matches
    const set = await questionSetsCol.findOne(query, {
      sort: { created_at: -1 }
    });

    if (set) {
      console.log('[QuestionSetService] ✅ Found existing quiz set:', set.set_id);
    } else {
      console.log('[QuestionSetService] ❌ No existing quiz set found');
    }

    return set as QuestionSet | null;
  }

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
   * 🎯 MAIN ENTRY POINT: Find existing quiz set OR create new one
   * This is the core reuse logic that should be called by the API route
   */
  static async findOrCreateQuizSet(
    request: GenerateQuizRequest,
    chapterText: string
  ): Promise<{ questionSet: QuestionSet; is_new: boolean }> {
    console.log('[QuestionSetService] findOrCreateQuizSet called:', {
      class_number: request.class_number,
      subject: request.subject,
      chapter: request.chapter,
      topic: request.topic,
      difficulty_label: request.difficulty_label,
    });

    // STEP 1: Try to find existing quiz set
    const existingSet = await this.findExistingQuizSet(
      request.class_number,
      request.subject,
      request.chapter,
      request.topic,
      request.difficulty_label
    );

    if (existingSet) {
      console.log('[QuestionSetService] ♻️  REUSING existing quiz set:', existingSet.set_id);
      return {
        questionSet: existingSet,
        is_new: false,
      };
    }

    // STEP 2: No existing set found, generate new one via AI
    console.log('[QuestionSetService] 🤖 No existing set found, generating new quiz via AI');

    // Import LLMService dynamically to avoid circular dependencies
    const { LLMService } = await import('./llmService');

    // Generate questions via AI (returns old format)
    const oldQuestions = await LLMService.generateQuestionsFromText(
      chapterText,
      request.class_label,
      request.subject,
      request.chapter,
      request.class_number,
      request.topic
    );

    // Convert to new question format
    const questions: Question[] = oldQuestions.map((q) => this.convertOldQuestionToNew(q));

    // Calculate average difficulty
    const avgDifficulty = questions.reduce((sum, q) => sum + q.difficulty_score, 0) / questions.length;
    const difficultyLevel = Math.round(avgDifficulty * 10); // Convert 0-1 to 1-10

    // Create and save new question set
    const newSet = await this.createQuestionSet(request, questions, difficultyLevel);

    console.log('[QuestionSetService] ✅ New quiz set created:', newSet.set_id);

    return {
      questionSet: newSet,
      is_new: true,
    };
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
      difficulty_label: request.difficulty_label, // ← Added
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

  /**
   * 🎯 SUBMIT QUIZ ATTEMPT: Store student's quiz attempt separately
   * This creates a new attempt record without modifying the shared question set
   */
  static async submitQuizAttempt(request: SubmitQuizRequest): Promise<SubmitQuizResponse> {
    console.log('[QuestionSetService] submitQuizAttempt called:', {
      student_id: request.student_id,
      set_id: request.set_id,
      answers_count: request.answers.length,
    });

    // Fetch the question set to grade the answers
    const questionSet = await this.findSetById(request.set_id);
    if (!questionSet) {
      throw new Error(`Question set not found: ${request.set_id}`);
    }

    // Build answer map for easy lookup
    const answerMap: Record<string, number> = {};
    request.answers.forEach((ans) => {
      answerMap[ans.question_id] = ans.selected_option_index;
    });

    // Grade each question and build answer array
    const gradedAnswers: QuestionAnswer[] = [];
    let correctCount = 0;
    const featuresAggregated: QuestionFeatures = {
      memorization: 0,
      reasoning: 0,
      numerical: 0,
      language: 0,
    };

    questionSet.questions.forEach((question) => {
      const selectedIndex = answerMap[question.id];
      const isCorrect = selectedIndex === question.correct_option_index;

      gradedAnswers.push({
        question_id: question.id,
        selected_option_index: selectedIndex !== undefined ? selectedIndex : -1,
        is_correct: isCorrect,
      });

      if (isCorrect) {
        correctCount++;
        // Add features for correct answers
        featuresAggregated.memorization += question.features.memorization;
        featuresAggregated.reasoning += question.features.reasoning;
        featuresAggregated.numerical += question.features.numerical;
        featuresAggregated.language += question.features.language;
      }
    });

    const totalQuestions = questionSet.questions.length;
    const incorrectCount = totalQuestions - correctCount;
    const scorePercentage = (correctCount / totalQuestions) * 100;

    // Normalize features (average across correct answers)
    if (correctCount > 0) {
      featuresAggregated.memorization /= correctCount;
      featuresAggregated.reasoning /= correctCount;
      featuresAggregated.numerical /= correctCount;
      featuresAggregated.language /= correctCount;
    }

    // Create attempt record
    const attemptId = request.attempt_id || `attempt_${uuidv4().substring(0, 12)}`;

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
      answers: gradedAnswers,
      score_total: correctCount,
      score_percentage: scorePercentage,
      total_questions: totalQuestions,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      features_aggregated: featuresAggregated,
      submitted_at: new Date(),
    };

    // Save attempt to database
    const attemptsCol = collections.question_set_attempts();
    await attemptsCol.insertOne(attempt);

    console.log('[QuestionSetService] ✅ Quiz attempt saved:', {
      attempt_id: attemptId,
      score_percentage: scorePercentage.toFixed(2),
      correct_count: correctCount,
      total_questions: totalQuestions,
    });

    // Calculate skill breakdown
    const skillBreakdown: SkillScore[] = [];
    const skillMap = new Map<string, { score: number; count: number }>();

    questionSet.questions.forEach((question, index) => {
      const isCorrect = gradedAnswers[index].is_correct;
      question.skills.forEach((skill) => {
        const existing = skillMap.get(skill) || { score: 0, count: 0 };
        skillMap.set(skill, {
          score: existing.score + (isCorrect ? 1 : 0),
          count: existing.count + 1,
        });
      });
    });

    skillMap.forEach((value, skillName) => {
      const score = value.count > 0 ? value.score / value.count : 0;
      const masteryLevel: MasteryLevel =
        score >= 0.8 ? 'expert' : score >= 0.6 ? 'competent' : score >= 0.4 ? 'learner' : 'novice';

      skillBreakdown.push({
        skill_name: skillName,
        score: score,
        mastery_level: masteryLevel,
        questions_answered: value.count,
      });
    });

    return {
      attempt_id: attemptId,
      score_total: correctCount,
      score_percentage: parseFloat(scorePercentage.toFixed(2)),
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      total_questions: totalQuestions,
      features_aggregated: featuresAggregated,
      skill_breakdown: skillBreakdown,
    };
  }
}
