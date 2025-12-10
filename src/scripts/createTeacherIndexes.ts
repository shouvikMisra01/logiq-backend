import { connectDB, closeDB, collections } from '../config/database';

async function createIndexes() {
  try {
    await connectDB();
    console.log('Creating teacher indexes...');

    await collections.teachers().createIndex(
      { school_id: 1, email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $exists: true } }
      }
    );
    console.log('✅ Created unique index on teachers: school_id + email');

    await collections.teacher_assignments().createIndex({ teacher_id: 1, school_id: 1 });
    console.log('✅ Created index on teacher_assignments: teacher_id + school_id');

    console.log('All indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await closeDB();
  }
}

createIndexes();
