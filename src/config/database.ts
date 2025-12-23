// src/config/database.ts
/**
 * MongoDB Database Connection
 */

import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, Db, Collection, Document } from 'mongodb';

const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://localhost:27017';
// Automatically select database name based on environment if not explicitly set
const ENV = process.env.NODE_ENV || 'development';
const DEFAULT_DB_NAME = ENV === 'production' ? 'ai_tutor_db_prod' : 'ai_tutor_db_dev';
const DB_NAME: string = process.env.DB_NAME || DEFAULT_DB_NAME;

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Set up MongoDB indexes for efficient querying
 * This should be called once during application initialization
 */
export async function setupIndexes(): Promise<void> {
  try {
    const database = getDB();
    console.log('[Database] Setting up MongoDB indexes...');

    // ============================================================================
    // QUESTION SETS INDEXES - For efficient quiz set lookups
    // ============================================================================
    const questionSetsCol = database.collection('question_sets');

    // Compound index for finding existing quiz sets
    // Used by: QuestionSetService.findExistingQuizSet()
    await questionSetsCol.createIndex(
      {
        class_number: 1,
        subject: 1,
        chapter: 1,
        topic: 1,
        difficulty_label: 1,
      },
      {
        name: 'quiz_set_lookup_idx',
        background: true,
      }
    );

    // Index for finding all sets by topic
    // Used by: QuestionSetService.findSetsByTopic()
    await questionSetsCol.createIndex(
      {
        class_number: 1,
        subject: 1,
        chapter: 1,
        topic: 1,
      },
      {
        name: 'topic_sets_idx',
        background: true,
      }
    );

    // Index for finding sets by ID
    await questionSetsCol.createIndex(
      { set_id: 1 },
      {
        name: 'set_id_idx',
        unique: true,
        background: true,
      }
    );

    // Index for created_at (for sorting by most recent)
    await questionSetsCol.createIndex(
      { created_at: -1 },
      {
        name: 'created_at_idx',
        background: true,
      }
    );

    console.log('[Database] ✅ question_sets indexes created');

    // ============================================================================
    // QUESTION SET ATTEMPTS INDEXES - For student attempt tracking
    // ============================================================================
    const attemptsCol = database.collection('question_set_attempts');

    // Index for finding student's attempts
    await attemptsCol.createIndex(
      { student_id: 1, submitted_at: -1 },
      {
        name: 'student_attempts_idx',
        background: true,
      }
    );

    // Compound index for finding attempted sets by topic
    // Used by: QuestionSetService.getAttemptedSetIds()
    await attemptsCol.createIndex(
      {
        student_id: 1,
        class_number: 1,
        subject: 1,
        chapter: 1,
        topic: 1,
      },
      {
        name: 'student_topic_attempts_idx',
        background: true,
      }
    );

    // Index for attempt ID
    await attemptsCol.createIndex(
      { attempt_id: 1 },
      {
        name: 'attempt_id_idx',
        unique: true,
        background: true,
      }
    );

    // Index for set_id to find all attempts for a quiz set
    await attemptsCol.createIndex(
      { set_id: 1 },
      {
        name: 'set_id_lookup_idx',
        background: true,
      }
    );

    console.log('[Database] ✅ question_set_attempts indexes created');

    // ============================================================================
    // STUDENT SKILL STATS INDEXES - For analytics
    // ============================================================================
    const skillStatsCol = database.collection('student_skill_stats');

    // Index for finding student's skill stats
    await skillStatsCol.createIndex(
      {
        student_id: 1,
        subject: 1,
        topic: 1,
      },
      {
        name: 'student_skill_stats_idx',
        background: true,
      }
    );

    console.log('[Database] ✅ student_skill_stats indexes created');

    // ============================================================================
    // EMAIL TOKENS INDEXES - For System-wide Auth
    // ============================================================================
    const emailTokensCol = database.collection('email_tokens');

    // Unique Token Index
    await emailTokensCol.createIndex(
      { token: 1 },
      {
        name: 'token_lookup_idx',
        unique: true,
        background: true,
      }
    );

    // TTL Index for automatic expiration
    await emailTokensCol.createIndex(
      { expiresAt: 1 },
      {
        name: 'token_expiry_idx',
        expireAfterSeconds: 0, // Expires exactly at the time specified in expiresAt
        background: true,
      }
    );

    console.log('[Database] ✅ email_tokens indexes created');

    // Index for email to optimize lookup/cleanup
    await emailTokensCol.createIndex(
      { email: 1 },
      {
        name: 'email_lookup_idx',
        background: true,
      }
    );

    console.log('[Database] 🎉 All indexes set up successfully');
  } catch (error: any) {
    console.error('[Database] ❌ Error setting up indexes:', error.message);
    // Don't throw - indexes are important but not critical for app startup
    // They can be set up later if needed
  }
}

/**
 * Connect to MongoDB
 */
export async function connectDB(): Promise<{ client: MongoClient; db: Db }> {
  try {
    if (client && db) {
      console.log('✅ MongoDB already connected');
      return { client, db };
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);

    console.log(`✅ MongoDB connected: ${DB_NAME}`);
    console.log(`📚 Database: ${db.databaseName}`);

    // Set up indexes after connection (run in background)
    setupIndexes().catch((err) => {
      console.error('[Database] Failed to set up indexes:', err);
    });

    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDB(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first');
  }
  return db;
}

/**
 * Get specific collection
 */
export function getCollection<T extends Document = Document>(name: string): Collection<T> {
  return getDB().collection<T>(name);
}

/**
 * Close database connection
 */
export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('👋 MongoDB connection closed');
  }
}

// Collections
export const collections = {
  schools: () => getCollection('schools'),
  students: () => getCollection('students'),
  super_admins: () => getCollection('super_admins'), // Super admins - full platform access
  school_admins: () => getCollection('school_admins'), // School admins - school-specific access
  admins: () => getCollection('admins'), // DEPRECATED: Use super_admins or school_admins instead
  chapters: () => getCollection('chapters'),
  syllabi: () => getCollection('syllabi'),
  pdf_documents: () => getCollection('pdf_documents'),
  quiz_attempts: () => getCollection('quiz_attempts'),
  study_plans: () => getCollection('study_plans'),
  parents: () => getCollection('parents'),

  // New quiz data model collections
  question_sets: () => getCollection('question_sets'),
  question_set_attempts: () => getCollection('question_set_attempts'),
  student_skill_stats: () => getCollection('student_skill_stats'),

  // Teacher management collections
  teachers: () => getCollection('teachers'),
  teacher_assignments: () => getCollection('teacher_assignments'),
  classes: () => getCollection('classes'),
  email_tokens: () => getCollection('email_tokens'),
};
