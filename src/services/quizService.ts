// src/services/quizService.ts
/**
 * Quiz Service - Main business logic for quiz operations
 */

import { v4 as uuidv4 } from 'uuid';
import { collections } from '../config/database';
import { LLMService } from './llmService';
import { SyllabusService } from './syllabusService';
import { QuestionSetService } from './questionSetService';
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
    const { student_id, school_id, class_id, subject, chapter, topic } = request;

    console.log('[QuizService] generateQuiz called:', {
      student_id,
      school_id,
      class_id,
      subject,
      chapter,
      topic,
    });

    try {
      // Database collection validation
      const quizCol = collections.quiz_attempts();
      if (!quizCol) {
        const errMsg = 'Quiz attempts collection is not initialized';
        console.error('[QuizService]', errMsg);
        throw new Error(errMsg);
      }

      // 1. Check for incomplete quizzes per topic
      console.log('[QuizService] Checking for incomplete quizzes per topic');
      let incompleteQuizzes;
      try {
        incompleteQuizzes = await quizCol
          .find({
            student_id,
            school_id,
            class_id,
            subject,
            topic, // Check per topic instead of chapter
            submitted_at: { $exists: false }, // Not submitted
          })
          .sort({ created_at: 1 }) // Oldest first
          .toArray();
      } catch (dbError: any) {
        console.error('[QuizService] Database error fetching incomplete quizzes:', dbError.message);
        throw new Error(`Database error: Failed to check incomplete quizzes: ${dbError.message}`);
      }

      // If 5 or more incomplete quizzes per topic, return the oldest one to complete
      if (incompleteQuizzes.length >= 5) {
        const oldestIncomplete = incompleteQuizzes[0] as QuizAttempt;

        console.log(
          `[QuizService] Found ${incompleteQuizzes.length} incomplete quizzes for topic "${topic}". Returning oldest incomplete quiz: ${oldestIncomplete.quiz_id}`
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

      // 2. Check if 5 question sets exist per topic in database
      console.log('[QuizService] Checking for existing question sets in database');
      let questionSets;
      try {
        questionSets = await QuestionSetService.findSetsByTopic(
          classNumber,
          subject,
          chapter,
          topic
        );
      } catch (dbError: any) {
        console.error('[QuizService] Error fetching question sets:', dbError.message);
        // Continue with AI generation if database check fails
        questionSets = [];
      }

      // If 5 or more question sets exist per topic, retrieve from database
      if (questionSets.length >= 5) {
        console.log(
          `[QuizService] Found ${questionSets.length} question sets for topic "${topic}". Retrieving from database instead of generating from AI.`
        );

        // Find an unattempted set for this student
        let unattemptedSet;
        try {
          unattemptedSet = await QuestionSetService.findUnattemptedSet(
            student_id,
            classNumber,
            subject,
            chapter,
            topic
          );
        } catch (dbError: any) {
          console.error('[QuizService] Error finding unattempted set:', dbError.message);
          throw new Error(`Failed to find unattempted question set: ${dbError.message}`);
        }

        if (unattemptedSet) {
          console.log(
            `[QuizService] Found unattempted question set: ${unattemptedSet.set_id}. Converting to quiz attempt.`
          );

          // Convert question set to quiz attempt format
          const quiz_id = `quiz_${uuidv4().substring(0, 12)}`;
          const now = new Date();
          const week_number = this.getWeekNumber(now);

          // Calculate quiz index for this student & topic
          let allQuizzes;
          try {
            allQuizzes = await quizCol
              .find({
                student_id,
                school_id,
                class_id,
                subject,
                topic,
              })
              .toArray();
          } catch (dbError: any) {
            console.error('[QuizService] Database error fetching all quizzes:', dbError.message);
            throw new Error(`Database error: Failed to fetch quiz history: ${dbError.message}`);
          }

          const quiz_index = allQuizzes.length + 1;

          // Convert QuestionSet questions to Quiz questions format
          const questions: Question[] = unattemptedSet.questions.map((q: any) => ({
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
              difficulty_score: q.difficulty_score || 5,
              difficulty_level: Math.ceil(q.difficulty_score * 10) || 5,
            },
          }));

          // Calculate average difficulty
          const avgDifficulty =
            questions.reduce((sum, q) => sum + q.features.difficulty_score, 0) / questions.length;
          const difficulty_level = LLMService.difficultyToLevel(avgDifficulty);

          const quizAttempt: Partial<QuizAttempt> = {
            quiz_id,
            student_id,
            school_id,
            class_id,
            subject,
            chapter,
            topic,
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

          console.log('[QuizService] Inserting quiz attempt from database set:', quiz_id, 'for student_id:', student_id);
          try {
            const insertResult = await quizCol.insertOne(quizAttempt);

            if (!insertResult.acknowledged) {
              console.error('[QuizService] ❌ Database write was not acknowledged!');
              throw new Error('Database write was not acknowledged');
            }

            console.log('[QuizService] ✅ Quiz inserted into database, insertedId:', insertResult.insertedId);
          } catch (dbError: any) {
            console.error('[QuizService] ❌ Database error inserting quiz attempt:', dbError.message);
            console.error('[QuizService] Error stack:', dbError.stack);
            throw new Error(`Database error: Failed to create quiz: ${dbError.message}`);
          }

          // Verify the quiz was actually saved
          try {
            const verification = await quizCol.findOne({ quiz_id });
            if (!verification) {
              console.error('[QuizService] ❌ CRITICAL: Quiz was inserted but cannot be found!');
              throw new Error('Quiz insertion verification failed - document not found after insert');
            }
            console.log('[QuizService] ✅ Quiz verified in database:', quiz_id);
          } catch (verifyError: any) {
            console.error('[QuizService] ❌ Verification error:', verifyError.message);
            throw new Error(`Failed to verify quiz insertion: ${verifyError.message}`);
          }

          console.log('[QuizService] ✅ Quiz created from database successfully:', {
            quiz_id,
            student_id,
            subject,
            topic,
            question_count: questions.length
          });
          return quizAttempt as QuizAttempt;
        } else {
          console.log(
            '[QuizService] All question sets have been attempted. Proceeding with AI generation for new content.'
          );
        }
      } else {
        console.log(
          `[QuizService] Only ${questionSets.length} question sets found for topic "${topic}". Need at least 5 to use database. Proceeding with AI generation.`
        );
      }

      // 3. Extract text from PDF using new Syllabus system
      console.log('[QuizService] Fetching chapter text from syllabus');
      let chapterText;
      try {
        chapterText = await SyllabusService.getChapterText(classNumber, subject, chapter);
      } catch (syllabusError: any) {
        console.error('[QuizService] Syllabus service error:', syllabusError.message);
        throw new Error(`Failed to get chapter text: ${syllabusError.message}`);
      }

      // 3. Generate questions using LLM
      console.log('[QuizService] Generating questions using LLM for topic:', topic);
      let questions;
      try {
        questions = await LLMService.generateQuestionsFromText(
          chapterText,
          class_id,
          subject,
          chapter,
          classNumber,
          topic // Pass topic to LLM for focused question generation
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

      // 4. Calculate quiz index for this student & topic (for tracking)
      console.log('[QuizService] Calculating quiz index');
      let allQuizzes;
      try {
        allQuizzes = await quizCol
          .find({
            student_id,
            school_id,
            class_id,
            subject,
            topic,
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
        topic,
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

      console.log('[QuizService] Inserting quiz attempt into database:', quiz_id, 'for student_id:', student_id);
      try {
        const insertResult = await quizCol.insertOne(quizAttempt);

        if (!insertResult.acknowledged) {
          console.error('[QuizService] ❌ Database write was not acknowledged!');
          throw new Error('Database write was not acknowledged');
        }

        console.log('[QuizService] ✅ Quiz inserted into database, insertedId:', insertResult.insertedId);
      } catch (dbError: any) {
        console.error('[QuizService] ❌ Database error inserting quiz attempt:', dbError.message);
        console.error('[QuizService] Error stack:', dbError.stack);
        throw new Error(`Database error: Failed to create quiz: ${dbError.message}`);
      }

      // Verify the quiz was actually saved
      try {
        const verification = await quizCol.findOne({ quiz_id });
        if (!verification) {
          console.error('[QuizService] ❌ CRITICAL: Quiz was inserted but cannot be found!');
          throw new Error('Quiz insertion verification failed - document not found after insert');
        }
        console.log('[QuizService] ✅ Quiz verified in database:', quiz_id);
      } catch (verifyError: any) {
        console.error('[QuizService] ❌ Verification error:', verifyError.message);
        throw new Error(`Failed to verify quiz insertion: ${verifyError.message}`);
      }

      console.log('[QuizService] ✅ Quiz generated and saved successfully:', {
        quiz_id,
        student_id,
        subject,
        chapter,
        topic,
        question_count: questions.length
      });
      return quizAttempt as QuizAttempt;
    } catch (error: any) {
      console.error('[QuizService] Fatal error in generateQuiz:', error.message);
      throw new Error(`Failed to generate quiz: ${error.message}`);
    }
  }

  /**
   * Sync V1 quiz submission to V2 system tables
   * Creates/updates: question_sets, question_set_attempts, student_skill_stats
   */
  private static async syncToV2System(
    quizAttempt: any,
    answerMap: Record<string, number>,
    correct_count: number,
    total_questions: number,
    score_total: number,
    feature_scores: any
  ): Promise<void> {
    // Extract class number from class_id
    const classNumber = parseInt(quizAttempt.class_id.replace(/\D/g, ''), 10) || 0;

    console.log('[QuizService V2 Sync] Creating question set and attempt for:', {
      quiz_id: quizAttempt.quiz_id,
      student_id: quizAttempt.student_id,
      class_number: classNumber,
      subject: quizAttempt.subject,
      topic: quizAttempt.topic,
    });

    // STEP 1: Create or find question set
    const questionSetsCol = collections.question_sets();
    let set_id = `set_from_quiz_${quizAttempt.quiz_id}`;

    // Check if we already created a set for this quiz
    let existingSet = await questionSetsCol.findOne({ set_id });

    if (!existingSet) {
      console.log('[QuizService V2 Sync] Creating new question set:', set_id);

      // Convert V1 questions to V2 format
      const v2Questions = quizAttempt.questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correct_option_index: q.correct_option_index,
        skills: q.skills || [],
        features: {
          memorization: q.features?.memorization || 0,
          reasoning: q.features?.reasoning || 0,
          numerical: q.features?.numerical || 0,
          language: q.features?.language || 0,
        },
        difficulty_score: q.features?.difficulty_score || 0.5,
      }));

      const questionSet = {
        set_id,
        class_number: classNumber,
        class_label: quizAttempt.class_id,
        subject: quizAttempt.subject,
        chapter: quizAttempt.chapter,
        topic: quizAttempt.topic,
        questions: v2Questions,
        difficulty_level: quizAttempt.difficulty_level || 5,
        difficulty_label: 'medium',
        created_at: quizAttempt.created_at || new Date(),
        created_by: quizAttempt.student_id,
      };

      await questionSetsCol.insertOne(questionSet);
      console.log('[QuizService V2 Sync] ✅ Question set created:', set_id);
    } else {
      console.log('[QuizService V2 Sync] Using existing question set:', set_id);
    }

    // STEP 2: Create question set attempt
    const attemptsCol = collections.question_set_attempts();
    const attempt_id = `attempt_from_quiz_${quizAttempt.quiz_id}`;

    // Check if attempt already exists
    const existingAttempt = await attemptsCol.findOne({ attempt_id });

    if (!existingAttempt) {
      console.log('[QuizService V2 Sync] Creating question set attempt:', attempt_id);

      // Build graded answers
      const gradedAnswers = quizAttempt.questions.map((q: any) => ({
        question_id: q.id,
        selected_option_index: answerMap[q.id] !== undefined ? answerMap[q.id] : -1,
        is_correct: answerMap[q.id] === q.correct_option_index,
      }));

      const questionSetAttempt = {
        attempt_id,
        student_id: String(quizAttempt.student_id),
        school_id: quizAttempt.school_id,
        set_id,
        class_number: classNumber,
        class_label: quizAttempt.class_id,
        subject: quizAttempt.subject,
        chapter: quizAttempt.chapter,
        topic: quizAttempt.topic,
        answers: gradedAnswers,
        score_total: correct_count,
        score_percentage: score_total * 100,
        total_questions,
        correct_count,
        incorrect_count: total_questions - correct_count,
        features_aggregated: {
          memorization: feature_scores.memorization || 0,
          reasoning: feature_scores.reasoning || 0,
          numerical: feature_scores.numerical || 0,
          language: feature_scores.language || 0,
        },
        submitted_at: new Date(),
      };

      await attemptsCol.insertOne(questionSetAttempt);
      console.log('[QuizService V2 Sync] ✅ Question set attempt created:', attempt_id);
    } else {
      console.log('[QuizService V2 Sync] Question set attempt already exists:', attempt_id);
    }

    // STEP 3: Update student skill stats
    console.log('[QuizService V2 Sync] Updating student skill stats');
    const skillStatsCol = collections.student_skill_stats();

    const statsQuery = {
      student_id: String(quizAttempt.student_id),
      school_id: quizAttempt.school_id,
      class_number: classNumber,
      subject: quizAttempt.subject,
      topic: quizAttempt.topic,
    };

    const existingStats = await skillStatsCol.findOne(statsQuery);

    if (existingStats) {
      // Update existing stats
      const newTotalQuestions = existingStats.total_questions_answered + total_questions;
      const newCorrectCount = existingStats.correct_count + correct_count;
      const newIncorrectCount = existingStats.incorrect_count + (total_questions - correct_count);
      const newAccuracy = (newCorrectCount / newTotalQuestions) * 100;

      // Update feature averages
      const oldWeight = existingStats.total_questions_answered;
      const newWeight = total_questions;
      const totalWeight = oldWeight + newWeight;

      const updatedFeatures = {
        memorization: ((existingStats.features_avg.memorization * oldWeight) + (feature_scores.memorization * newWeight)) / totalWeight,
        reasoning: ((existingStats.features_avg.reasoning * oldWeight) + (feature_scores.reasoning * newWeight)) / totalWeight,
        numerical: ((existingStats.features_avg.numerical * oldWeight) + (feature_scores.numerical * newWeight)) / totalWeight,
        language: ((existingStats.features_avg.language * oldWeight) + (feature_scores.language * newWeight)) / totalWeight,
      };

      await skillStatsCol.updateOne(statsQuery, {
        $set: {
          total_questions_answered: newTotalQuestions,
          correct_count: newCorrectCount,
          incorrect_count: newIncorrectCount,
          accuracy_percentage: newAccuracy,
          features_avg: updatedFeatures,
          last_attempt_at: new Date(),
          updated_at: new Date(),
        },
      });

      console.log('[QuizService V2 Sync] ✅ Student skill stats updated (existing)');
    } else {
      // Create new stats
      const newStats = {
        student_id: String(quizAttempt.student_id),
        school_id: quizAttempt.school_id,
        class_number: classNumber,
        subject: quizAttempt.subject,
        topic: quizAttempt.topic,
        total_questions_answered: total_questions,
        correct_count,
        incorrect_count: total_questions - correct_count,
        accuracy_percentage: (correct_count / total_questions) * 100,
        skills: [],
        features_avg: {
          memorization: feature_scores.memorization || 0,
          reasoning: feature_scores.reasoning || 0,
          numerical: feature_scores.numerical || 0,
          language: feature_scores.language || 0,
        },
        last_attempt_at: new Date(),
        updated_at: new Date(),
      };

      await skillStatsCol.insertOne(newStats);
      console.log('[QuizService V2 Sync] ✅ Student skill stats created (new)');
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
      console.log('[QuizService] Updating quiz submission for quiz_id:', quiz_id, 'student_id:', quizAttempt.student_id);
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

        if (!updateResult.acknowledged) {
          console.error('[QuizService] ❌ Database update was not acknowledged!');
          throw new Error('Database update was not acknowledged');
        }

        if (updateResult.matchedCount === 0) {
          console.error('[QuizService] ❌ Quiz not found in database - matchedCount: 0');
          throw new Error(`Quiz not found: ${quiz_id}`);
        }

        if (updateResult.modifiedCount === 0) {
          console.error('[QuizService] ❌ Quiz update affected 0 documents - quiz may already be submitted');
          throw new Error('Quiz update failed - no documents modified');
        }

        console.log('[QuizService] ✅ Quiz update acknowledged:', {
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
        });

        // Verify the update was actually saved
        const updatedQuiz = await quizCol.findOne({ quiz_id });
        if (!updatedQuiz) {
          console.error('[QuizService] ❌ CRITICAL: Quiz not found after update!');
          throw new Error('Quiz verification failed after update');
        }

        if (!updatedQuiz.submitted_at) {
          console.error('[QuizService] ❌ CRITICAL: Quiz found but submitted_at not set!');
          throw new Error('Quiz update verification failed - submitted_at not set');
        }

        console.log('[QuizService] ✅ Quiz submission verified in database');
        console.log('[QuizService] ✅ Quiz submitted successfully:', {
          quiz_id,
          student_id: quizAttempt.student_id,
          subject: quizAttempt.subject,
          topic: quizAttempt.topic,
          score: `${correct_count}/${total_questions}`,
          percentage: `${(score_total * 100).toFixed(1)}%`
        });
      } catch (dbError: any) {
        console.error('[QuizService] ❌ Database error updating quiz:', dbError.message);
        console.error('[QuizService] Error stack:', dbError.stack);
        throw new Error(`Database error: Failed to submit quiz: ${dbError.message}`);
      }

      // ============================================================================
      // DUAL-WRITE TO V2 SYSTEM: Populate question_sets, question_set_attempts, student_skill_stats
      // ============================================================================
      console.log('[QuizService] 🔄 Syncing submission to V2 system (question_sets, question_set_attempts, student_skill_stats)');
      try {
        await this.syncToV2System(
          quizAttempt,
          answerMap,
          correct_count,
          total_questions,
          score_total,
          feature_scores
        );
        console.log('[QuizService] ✅ V2 system sync completed successfully');
      } catch (syncError: any) {
        // Don't fail the entire submission if V2 sync fails - just log it
        console.error('[QuizService] ⚠️ Failed to sync to V2 system (non-critical):', syncError.message);
        console.error('[QuizService] V2 sync error stack:', syncError.stack);
      }

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
