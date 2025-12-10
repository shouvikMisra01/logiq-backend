// Check if quiz attempts are being saved in the database
import { connectDB, collections } from '../config/database';

async function checkQuizAttempts() {
  try {
    await connectDB();
    console.log('🔍 Checking quiz-related collections in MongoDB...\n');

    // Check question_set_attempts collection
    const attemptsCount = await collections.question_set_attempts().countDocuments();
    console.log(`📊 Question Set Attempts Collection: ${attemptsCount} records`);

    if (attemptsCount > 0) {
      const sampleAttempt = await collections.question_set_attempts().findOne();
      console.log('\n📝 Sample Attempt Record:');
      console.log(JSON.stringify(sampleAttempt, null, 2));
    }

    // Check student_skill_stats collection
    const skillStatsCount = await collections.student_skill_stats().countDocuments();
    console.log(`\n📈 Student Skill Stats Collection: ${skillStatsCount} records`);

    if (skillStatsCount > 0) {
      const sampleStat = await collections.student_skill_stats().findOne();
      console.log('\n📝 Sample Skill Stat Record:');
      console.log(JSON.stringify(sampleStat, null, 2));
    }

    // Check question_sets collection
    const questionSetsCount = await collections.question_sets().countDocuments();
    console.log(`\n❓ Question Sets Collection: ${questionSetsCount} records`);

    if (questionSetsCount > 0) {
      const sampleSet = await collections.question_sets().findOne();
      if (sampleSet) {
        console.log('\n📝 Sample Question Set:');
        console.log(`  Set ID: ${sampleSet.set_id}`);
        console.log(`  Subject: ${sampleSet.subject}`);
        console.log(`  Topic: ${sampleSet.topic}`);
        console.log(`  Questions: ${sampleSet.questions?.length || 0}`);
        console.log(`  Difficulty: ${sampleSet.difficulty_level}`);
      }
    }

    console.log('\n✅ Quiz data verification complete!');

    if (attemptsCount === 0) {
      console.log('\n⚠️  No quiz attempts found yet.');
      console.log('   Students need to complete a quiz for attempts to be saved.');
    } else {
      console.log(`\n✅ Quiz system is working! Found ${attemptsCount} quiz attempts in database.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkQuizAttempts();
