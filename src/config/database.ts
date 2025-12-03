// src/config/database.ts
/**
 * MongoDB Database Connection
 */

import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, Db, Collection, Document } from 'mongodb';

const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME: string = process.env.DB_NAME || 'ai_tutor_db';

let client: MongoClient | null = null;
let db: Db | null = null;

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
  admins: () => getCollection('admins'), // Super admins and school admins
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
};
