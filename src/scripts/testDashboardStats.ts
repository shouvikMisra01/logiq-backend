// Test dashboard stats endpoint with student ID 1
import { connectDB } from '../config/database';
import { StudentService } from '../services/studentService';

async function testDashboardStats() {
  try {
    await connectDB();
    console.log('🔍 Testing Dashboard Stats for Student ID: 1\n');

    const stats = await StudentService.getDashboardStats('student_001');

    console.log('✅ Dashboard Stats Retrieved Successfully!\n');
    console.log('📊 OVERALL METRICS:');
    console.log(`   Total Attempts: ${stats.overall_metrics.total_attempts}`);
    console.log(`   Total Questions: ${stats.overall_metrics.total_questions}`);
    console.log(`   Total Correct: ${stats.overall_metrics.total_correct}`);
    console.log(`   Overall Accuracy: ${stats.overall_metrics.overall_accuracy.toFixed(2)}%`);
    console.log(`   Subjects Studied: ${stats.overall_metrics.subjects_studied}`);

    console.log('\n📅 STUDY ACTIVITY:');
    console.log(`   Study Streak: ${stats.study_activity.study_streak} days`);
    console.log(`   Total Study Days: ${stats.study_activity.total_study_days}`);
    console.log(`   Last Activity: ${stats.study_activity.last_activity}`);

    console.log('\n🎯 TOP SKILLS:');
    if (stats.skills.length > 0) {
      stats.skills.forEach((skill: any, idx: number) => {
        console.log(`   ${idx + 1}. ${skill.skill_name}: ${(skill.score * 100).toFixed(1)}% (${skill.mastery_level})`);
      });
    } else {
      console.log('   No skills data yet');
    }

    console.log('\n💪 STRONG TOPICS:');
    if (stats.topic_performance.strong_topics.length > 0) {
      stats.topic_performance.strong_topics.forEach((topic: any, idx: number) => {
        console.log(`   ${idx + 1}. ${topic.topic}: ${topic.accuracy.toFixed(1)}% (${topic.attempts} attempts)`);
      });
    } else {
      console.log('   No strong topics yet');
    }

    console.log('\n📚 WEAK TOPICS:');
    if (stats.topic_performance.weak_topics.length > 0) {
      stats.topic_performance.weak_topics.forEach((topic: any, idx: number) => {
        console.log(`   ${idx + 1}. ${topic.topic}: ${topic.accuracy.toFixed(1)}% (${topic.attempts} attempts)`);
      });
    } else {
      console.log('   No weak topics identified');
    }

    console.log('\n🕒 RECENT ATTEMPTS (Last 5):');
    stats.recent_attempts.slice(0, 5).forEach((attempt: any, idx: number) => {
      console.log(`   ${idx + 1}. ${attempt.subject} - ${attempt.topic}`);
      console.log(`      Score: ${attempt.score_percentage.toFixed(1)}% (${attempt.correct_count}/${attempt.total_questions})`);
    });

    console.log('\n✅ Test Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDashboardStats();
