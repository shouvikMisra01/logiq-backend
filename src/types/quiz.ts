// src/types/quiz.ts
/**
 * Quiz System Types
 */

export interface FeatureScores {
  memorization: number;  // 0-1
  reasoning: number;     // 0-1
  numerical: number;     // 0-1
  language: number;      // 0-1
}

export interface QuestionFeatures extends FeatureScores {
  difficulty_score: number;  // 0-10
  difficulty_level: number;  // 1-10
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  skills: string[];
  features: QuestionFeatures;
}

export interface QuizAttempt {
  _id?: any;
  quiz_id: string;
  student_id: string;
  school_id: string;
  class_id: string;
  subject: string;
  chapter: string;
  topic: string;
  quiz_index: number;
  week_number: number;

  // Questions and answers
  questions: Question[];
  answers?: Record<string, number>;  // question_id -> chosen_index

  // Scores
  score_total: number;  // 0-1
  feature_scores: FeatureScores;

  // Difficulty
  difficulty_avg: number;  // 0-10
  difficulty_level: number;  // 1-10

  // Metadata
  created_at: Date;
  submitted_at?: Date;
}

export interface StudyPlan {
  _id?: any;
  student_id: string;
  week_start: Date;
  plan: any;  // JSON structure
  created_at: Date;
}

export interface QuizGenerateRequest {
  student_id: string;
  school_id: string;
  class_id: string;
  subject: string;
  chapter: string;
  topic: string;
}

export interface QuizSubmitRequest {
  quiz_id: string;
  answers: Array<{
    question_id: string;
    chosen_index: number;
  }>;
}

export interface QuizSubmitResult {
  score_total: number;
  feature_scores: FeatureScores;
  difficulty_level: number;
  correct_count: number;
  total_questions: number;
}

export interface StudyPlanRequest {
  student_id: string;
  school_id: string;
}

// LLM Response formats
export interface LLMQuestionResponse {
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correct_option_index: number;
    skills: string[];
    features: {
      memorization: number;
      reasoning: number;
      numerical: number;
      language: number;
    };
  }>;
}
