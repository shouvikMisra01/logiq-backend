// src/types/questionSet.ts
/**
 * TypeScript interfaces for the new quiz data model
 */

import { ObjectId } from 'mongodb';

// ============================================================
// QUESTION SET TYPES
// ============================================================

export interface QuestionFeatures {
  memorization: number;   // 0-1
  reasoning: number;      // 0-1
  numerical: number;      // 0-1
  language: number;       // 0-1
}

export interface Question {
  id: string;                      // e.g. "Q1", "Q2"
  question: string;                // Can contain LaTeX
  options: string[];               // Array of 4 options
  correct_option_index: number;    // 0-3
  skills: string[];                // e.g. ["numerical", "reasoning"]
  features: QuestionFeatures;
  difficulty_score: number;        // 0-1
}

export interface QuestionSet {
  _id?: ObjectId;
  set_id: string;                  // Unique identifier
  class_number: number;            // e.g. 9
  class_label: string;             // e.g. "Class 9"
  subject: string;                 // Normalized subject name
  chapter: string;
  topic: string;
  questions: Question[];
  difficulty_level: number;        // Overall set difficulty
  created_at: Date;
  created_by?: string;             // Optional: student_id who triggered generation
}

// ============================================================
// ATTEMPT TYPES
// ============================================================

export interface QuestionAnswer {
  question_id: string;             // e.g. "Q1"
  selected_option_index: number;   // 0-3
  is_correct: boolean;
}

export interface QuestionSetAttempt {
  _id?: ObjectId;
  attempt_id: string;              // Unique identifier
  student_id: string;
  school_id: string;
  set_id: string;                  // Reference to question_sets
  class_number: number;
  class_label: string;
  subject: string;
  chapter: string;
  topic: string;
  answers: QuestionAnswer[];
  score_total: number;             // 0-100
  score_percentage: number;        // 0-100
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  features_aggregated: QuestionFeatures;  // Weighted average based on correctness
  submitted_at: Date;
}

// ============================================================
// SKILL STATS TYPES
// ============================================================

export type MasteryLevel = 'novice' | 'learner' | 'competent' | 'expert';

export interface SkillScore {
  skill_name: string;              // e.g. "numerical", "reasoning"
  score: number;                   // 0-1
  mastery_level: MasteryLevel;
  questions_answered: number;      // Total questions for this skill
}

export interface StudentSkillStats {
  _id?: ObjectId;
  student_id: string;
  school_id: string;
  class_number: number;
  subject: string;
  topic?: string;                  // Optional: for topic-level stats
  total_questions_answered: number;
  correct_count: number;
  incorrect_count: number;
  accuracy_percentage: number;     // correct_count / total_questions_answered
  skills: SkillScore[];
  features_avg: QuestionFeatures;  // Average feature scores
  last_attempt_at?: Date;
  updated_at: Date;
}

// ============================================================
// REQUEST/RESPONSE TYPES
// ============================================================

export interface GenerateQuizRequest {
  student_id: string;
  school_id: string;
  class_number: number;
  class_label: string;
  subject: string;
  chapter: string;
  topic: string;
  num_questions?: number;          // Default 10
}

export interface GenerateQuizResponse {
  set_id: string;
  questions: Question[];
  difficulty_level: number;
  is_new_set: boolean;             // true if newly generated, false if reused
  message?: string;
}

export interface SubmitQuizRequest {
  attempt_id?: string;             // Optional, can be generated server-side
  student_id: string;
  school_id: string;
  set_id: string;
  answers: Array<{
    question_id: string;
    selected_option_index: number;
  }>;
}

export interface SubmitQuizResponse {
  attempt_id: string;
  score_total: number;
  score_percentage: number;
  correct_count: number;
  incorrect_count: number;
  total_questions: number;
  features_aggregated: QuestionFeatures;
  skill_breakdown: SkillScore[];
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

export interface StudentProgressAnalytics {
  student_id: string;
  subject: string;
  total_attempts: number;
  total_questions: number;
  overall_accuracy: number;
  skills: SkillScore[];
  topics: Array<{
    topic: string;
    attempts: number;
    accuracy: number;
  }>;
  recent_attempts: Array<{
    attempt_id: string;
    topic: string;
    score: number;
    submitted_at: Date;
  }>;
}

export interface TopicPerformance {
  topic: string;
  total_sets: number;
  attempted_sets: number;
  unattempted_sets: number;
  average_score: number;
  last_attempt?: Date;
}
