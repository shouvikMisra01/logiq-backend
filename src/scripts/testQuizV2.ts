// src/scripts/testQuizV2.ts
/**
 * Test script for Quiz V2 API endpoints
 */

const BACKEND_URL = 'http://localhost:8000';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function log(test: string, passed: boolean, message: string, data?: any) {
  results.push({ test, passed, message, data });
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${test}: ${message}`);
  if (data) {
    console.log('   Data:', JSON.stringify(data, null, 2));
  }
}

async function testGenerateQuiz() {
  const testName = 'Generate Quiz (First Time)';

  try {
    const response = await fetch(`${BACKEND_URL}/api/quiz-v2/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: 'student_001',
        school_id: 'school_001',
        class_number: 9,
        class_label: 'Class 9',
        subject: 'Physics',
        chapter: 'Motion',
        topic: 'Velocity and Acceleration',
        num_questions: 10,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      log(testName, false, `HTTP ${response.status}: ${error.error}`);
      return null;
    }

    const data = await response.json() as any;

    if (!data.set_id || !data.questions || data.questions.length !== 10) {
      log(testName, false, 'Response missing required fields or wrong question count');
      return null;
    }

    log(
      testName,
      true,
      `Generated set ${data.set_id} (is_new_set: ${data.is_new_set})`,
      {
        set_id: data.set_id,
        is_new_set: data.is_new_set,
        question_count: data.questions.length,
        difficulty_level: data.difficulty_level,
      }
    );

    return data;
  } catch (error: any) {
    log(testName, false, error.message);
    return null;
  }
}

async function testReuseQuiz() {
  const testName = 'Generate Quiz (Reuse Test)';

  try {
    // Generate again for the same student and topic
    const response = await fetch(`${BACKEND_URL}/api/quiz-v2/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: 'student_001',
        school_id: 'school_001',
        class_number: 9,
        class_label: 'Class 9',
        subject: 'Physics',
        chapter: 'Motion',
        topic: 'Velocity and Acceleration',
        num_questions: 10,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      log(testName, false, `HTTP ${response.status}: ${error.error}`);
      return null;
    }

    const data = await response.json() as any;

    if (data.is_new_set === false) {
      log(
        testName,
        true,
        `Successfully reused existing set ${data.set_id}`,
        { set_id: data.set_id, is_new_set: data.is_new_set }
      );
      return data;
    } else {
      log(
        testName,
        false,
        'Expected to reuse set but got a new one (student may have attempted all sets)'
      );
      return data;
    }
  } catch (error: any) {
    log(testName, false, error.message);
    return null;
  }
}

async function testSubmitQuiz(setId: string) {
  const testName = 'Submit Quiz';

  try {
    // Create sample answers (all selecting option 0)
    const answers = [];
    for (let i = 1; i <= 10; i++) {
      answers.push({
        question_id: `Q${i}`,
        selected_option_index: 0,
      });
    }

    const response = await fetch(`${BACKEND_URL}/api/quiz-v2/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: 'student_001',
        school_id: 'school_001',
        set_id: setId,
        answers,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      log(testName, false, `HTTP ${response.status}: ${error.error}`);
      return null;
    }

    const data = await response.json() as any;

    if (!data.attempt_id || !data.skill_breakdown) {
      log(testName, false, 'Response missing required fields');
      return null;
    }

    log(
      testName,
      true,
      `Created attempt ${data.attempt_id}, score: ${data.score_percentage.toFixed(1)}%`,
      {
        attempt_id: data.attempt_id,
        score: data.score_percentage,
        skills: data.skill_breakdown.map((s: any) => ({
          skill: s.skill_name,
          mastery: s.mastery_level,
        })),
      }
    );

    return data;
  } catch (error: any) {
    log(testName, false, error.message);
    return null;
  }
}

async function testGetHistory() {
  const testName = 'Get Quiz History';

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/quiz-v2/history/student_001?subject=Physics&limit=5`
    );

    if (!response.ok) {
      log(testName, false, `HTTP ${response.status}`);
      return;
    }

    const data = await response.json() as any;

    log(testName, true, `Found ${data.count} attempts`, {
      count: data.count,
      recent: data.attempts.slice(0, 2).map((a: any) => ({
        topic: a.topic,
        score: a.score_percentage,
      })),
    });
  } catch (error: any) {
    log(testName, false, error.message);
  }
}

async function testGetStats() {
  const testName = 'Get Student Stats';

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/quiz-v2/stats/student_001/Physics`
    );

    if (!response.ok) {
      const error = await response.json() as any;
      log(testName, false, `HTTP ${response.status}: ${error.error}`);
      return;
    }

    const data = await response.json() as any;

    log(
      testName,
      true,
      `Accuracy: ${data.accuracy_percentage.toFixed(1)}%, ${data.total_questions_answered} questions answered`,
      {
        accuracy: data.accuracy_percentage,
        skills: data.skills.map((s: any) => ({
          skill: s.skill_name,
          score: s.score.toFixed(2),
          mastery: s.mastery_level,
        })),
      }
    );
  } catch (error: any) {
    log(testName, false, error.message);
  }
}

async function testGetTopics() {
  const testName = 'Get Topic Performance';

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/quiz-v2/topics/student_001/Physics`
    );

    if (!response.ok) {
      log(testName, false, `HTTP ${response.status}`);
      return;
    }

    const data = await response.json() as any;

    log(testName, true, `Found ${data.count} topics`, {
      count: data.count,
      topics: data.topics.map((t: any) => ({
        topic: t.topic,
        attempts: t.attempts,
        avg_score: t.avg_score.toFixed(1),
      })),
    });
  } catch (error: any) {
    log(testName, false, error.message);
  }
}

async function runAllTests() {
  console.log('\n🧪 Starting Quiz V2 API Tests...\n');
  console.log('='.repeat(60));

  // Test 1: Generate quiz for first time
  const quiz1 = await testGenerateQuiz();

  if (!quiz1) {
    console.log('\n❌ Cannot continue tests without a valid quiz generation');
    return;
  }

  // Small delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 2: Submit the quiz
  const submission = await testSubmitQuiz((quiz1 as any).set_id);

  if (!submission) {
    console.log('\n❌ Quiz submission failed, skipping remaining tests');
    return;
  }

  // Small delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 3: Try to reuse the quiz (should return same set for another attempt)
  await testReuseQuiz();

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 4: Get history
  await testGetHistory();

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 5: Get stats
  await testGetStats();

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 6: Get topic performance
  await testGetTopics();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check logs above.\n');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});
