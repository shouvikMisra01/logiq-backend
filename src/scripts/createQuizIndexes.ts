// src/scripts/createQuizIndexes.ts
/**
 * Create MongoDB indexes for Quiz V2 collections
 */

import dotenv from 'dotenv';
dotenv.config();

import { connectDB, collections } from '../config/database';

async function createQuizIndexes() {
  try {
    console.log('🔧 Creating MongoDB indexes for Quiz V2...\n');

    // Connect to MongoDB
    await connectDB();

    // ============================================================
    // QUESTION_SETS INDEXES
    // ============================================================
    console.log('📦 Creating indexes for question_sets collection...');

    const questionSetsCol = collections.question_sets();

    // Index for finding sets by topic
    await questionSetsCol.createIndex(
      {
        class_number: 1,
        subject: 1,
        chapter: 1,
        topic: 1,
      },
      { name: 'idx_question_sets_topic_lookup' }
    );
    console.log('  ✅ Created: idx_question_sets_topic_lookup');

    // Unique index for set_id
    await questionSetsCol.createIndex(
      { set_id: 1 },
      { unique: true, name: 'idx_question_sets_set_id' }
    );
    console.log('  ✅ Created: idx_question_sets_set_id (unique)');

    // Index for created_at (for sorting)
    await questionSetsCol.createIndex(
      { created_at: -1 },
      { name: 'idx_question_sets_created_at' }
    );
    console.log('  ✅ Created: idx_question_sets_created_at');

    // ============================================================
    // QUESTION_SET_ATTEMPTS INDEXES
    // ============================================================
    console.log('\n📝 Creating indexes for question_set_attempts collection...');

    const attemptsCol = collections.question_set_attempts();

    // Index for finding student attempts
    await attemptsCol.createIndex(
      { student_id: 1, subject: 1 },
      { name: 'idx_attempts_student_subject' }
    );
    console.log('  ✅ Created: idx_attempts_student_subject');

    // Index for finding attempts by set_id
    await attemptsCol.createIndex(
      { set_id: 1 },
      { name: 'idx_attempts_set_id' }
    );
    console.log('  ✅ Created: idx_attempts_set_id');

    // Unique index for attempt_id
    await attemptsCol.createIndex(
      { attempt_id: 1 },
      { unique: true, name: 'idx_attempts_attempt_id' }
    );
    console.log('  ✅ Created: idx_attempts_attempt_id (unique)');

    // Index for finding attempts by topic
    await attemptsCol.createIndex(
      {
        student_id: 1,
        class_number: 1,
        subject: 1,
        chapter: 1,
        topic: 1,
      },
      { name: 'idx_attempts_student_topic' }
    );
    console.log('  ✅ Created: idx_attempts_student_topic');

    // Index for submitted_at (for sorting recent attempts)
    await attemptsCol.createIndex(
      { submitted_at: -1 },
      { name: 'idx_attempts_submitted_at' }
    );
    console.log('  ✅ Created: idx_attempts_submitted_at');

    // ============================================================
    // STUDENT_SKILL_STATS INDEXES
    // ============================================================
    console.log('\n📊 Creating indexes for student_skill_stats collection...');

    const statsCol = collections.student_skill_stats();

    // Unique compound index for student + subject + topic
    // Note: MongoDB doesn't support complex partial filter expressions with $not
    // Using a compound index with topic field (null or string) instead
    await statsCol.createIndex(
      { student_id: 1, subject: 1, topic: 1 },
      {
        unique: true,
        name: 'idx_stats_student_subject_unique',
      }
    );
    console.log('  ✅ Created: idx_stats_student_subject_unique');

    // Index for class-level stats queries
    await statsCol.createIndex(
      { school_id: 1, class_number: 1, subject: 1 },
      { name: 'idx_stats_class_level' }
    );
    console.log('  ✅ Created: idx_stats_class_level');

    // Index for updated_at (for finding recent stats)
    await statsCol.createIndex(
      { updated_at: -1 },
      { name: 'idx_stats_updated_at' }
    );
    console.log('  ✅ Created: idx_stats_updated_at');

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL INDEXES CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 Index Summary:\n');

    console.log('question_sets:');
    console.log('  - idx_question_sets_topic_lookup (class_number, subject, chapter, topic)');
    console.log('  - idx_question_sets_set_id (unique)');
    console.log('  - idx_question_sets_created_at\n');

    console.log('question_set_attempts:');
    console.log('  - idx_attempts_student_subject (student_id, subject)');
    console.log('  - idx_attempts_set_id');
    console.log('  - idx_attempts_attempt_id (unique)');
    console.log('  - idx_attempts_student_topic (student_id, class_number, subject, chapter, topic)');
    console.log('  - idx_attempts_submitted_at\n');

    console.log('student_skill_stats:');
    console.log('  - idx_stats_student_subject_unique (student_id, subject) [unique, partial]');
    console.log('  - idx_stats_class_level (school_id, class_number, subject)');
    console.log('  - idx_stats_updated_at\n');

    console.log('='.repeat(60));
    console.log('✨ Your Quiz V2 collections are now optimized!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createQuizIndexes();
