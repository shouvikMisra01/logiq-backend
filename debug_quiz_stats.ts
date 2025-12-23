import { MongoClient } from 'mongodb';

async function main() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_tutor_db_dev';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to database');

        const db = client.db();
        const studentsCol = db.collection('students');
        const newAttemptsCol = db.collection('question_set_attempts');
        const oldAttemptsCol = db.collection('quiz_attempts');

        // Find the student
        const email = 'aditi@student.com';
        const student = await studentsCol.findOne({ email });

        if (!student) {
            console.log('Student not found for email:', email);
            return;
        }

        console.log('Found Student:', {
            _id: student._id,
            student_id: student.student_id,
            name: student.name,
            email: student.email
        });

        const studentId = student.student_id;

        // 1. Check New Attempts
        const newAttempts = await newAttemptsCol.find({ student_id: studentId }).toArray();
        console.log(`\nNew System Attempts (question_set_attempts): ${newAttempts.length}`);
        newAttempts.forEach(a => {
            console.log(`- ID: ${a._id}, Set: ${a.set_id}, At: ${a.attempted_at}, Score: ${a.score_percentage}%`);
        });

        // 2. Check Old Attempts
        let oldSystemStudentId = studentId;
        const match = studentId.match(/^student_(\d+)$/);
        if (match) {
            oldSystemStudentId = parseInt(match[1], 10);
        }
        console.log(`\nOld System Student ID derived: ${oldSystemStudentId} (Type: ${typeof oldSystemStudentId})`);

        const oldAttempts = await oldAttemptsCol.find({ student_id: oldSystemStudentId }).toArray();
        console.log(`Old System Attempts (quiz_attempts): ${oldAttempts.length}`);
        oldAttempts.forEach(a => {
            console.log(`- ID: ${a._id}, Quiz: ${a.quiz_id}, At: ${a.created_at || a.submitted_at}, Score: ${a.score_total}`);
        });

        // 3. Check for potential duplicates (by time or similarity)
        console.log('\nPotential Duplicates Analysis:');
        for (const n of newAttempts) {
            for (const o of oldAttempts) {
                const nTime = new Date(n.attempted_at).getTime();
                const oTime = new Date(o.created_at || o.submitted_at).getTime();
                const diff = Math.abs(nTime - oTime);

                // If timestamps are within 5 seconds, it's suspicious
                if (diff < 5000) {
                    console.log(`MATCH FOUND! New (${n._id}) and Old (${o._id}) are close in time.`);
                    console.log(`Diff: ${diff}ms`);
                }
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

main();
