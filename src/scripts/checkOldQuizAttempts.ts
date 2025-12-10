// Check old quiz_attempts collection structure
import { connectDB, collections } from '../config/database';

async function checkOldQuizAttempts() {
  try {
    await connectDB();
    console.log('🔍 Checking OLD quiz_attempts collection...\n');

    const attemptsCount = await collections.quiz_attempts().countDocuments();
    console.log(`📊 Quiz Attempts Collection: ${attemptsCount} records`);

    if (attemptsCount > 0) {
      const sampleAttempt = await collections.quiz_attempts().findOne();
      console.log('\n📝 Sample Quiz Attempt Record:');
      console.log(JSON.stringify(sampleAttempt, null, 2));

      // Get all attempts for insights
      const allAttempts = await collections.quiz_attempts().find({}).limit(5).toArray();
      console.log(`\n📋 Found ${allAttempts.length} sample attempts`);
      allAttempts.forEach((attempt: any, idx: number) => {
        console.log(`\nAttempt ${idx + 1}:`);
        console.log(`  Student ID: ${attempt.student_id}`);
        console.log(`  Quiz ID: ${attempt.quiz_id}`);
        console.log(`  Score: ${attempt.score_total}`);
        console.log(`  Subject: ${attempt.subject || 'N/A'}`);
        console.log(`  Chapter: ${attempt.chapter || 'N/A'}`);
        console.log(`  Date: ${attempt.submitted_at || attempt.created_at}`);
      });
    }

    console.log('\n✅ Check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkOldQuizAttempts();
