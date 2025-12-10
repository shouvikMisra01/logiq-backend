// Fix teacher assignments that have MongoDB _id instead of student_id
import { connectDB, collections } from '../config/database';
import { ObjectId } from 'mongodb';

async function fixTeacherAssignments() {
  try {
    await connectDB();
    console.log('🔧 Fixing teacher assignments...');

    // Get all assignments
    const assignments = await collections.teacher_assignments().find({}).toArray();

    console.log(`Found ${assignments.length} assignments to check`);

    for (const assignment of assignments) {
      if (assignment.student_ids && assignment.student_ids.length > 0) {
        const wrongIds = assignment.student_ids;
        const correctIds: string[] = [];

        for (const wrongId of wrongIds) {
          try {
            // Try to find student by _id (MongoDB ObjectId)
            const student = await collections.students().findOne({ _id: new ObjectId(wrongId) as any });

            if (student && student.student_id) {
              console.log(`  Fixing: ${wrongId} -> ${student.student_id} (${student.name})`);
              correctIds.push(student.student_id);
            } else {
              // If not found by _id, check if it's already a correct student_id
              const existingStudent = await collections.students().findOne({ student_id: wrongId });
              if (existingStudent) {
                console.log(`  Already correct: ${wrongId} (${existingStudent.name})`);
                correctIds.push(wrongId);
              } else {
                console.log(`  ⚠️  Student not found: ${wrongId}`);
              }
            }
          } catch (err) {
            // If ObjectId conversion fails, it might already be a student_id
            const existingStudent = await collections.students().findOne({ student_id: wrongId });
            if (existingStudent) {
              console.log(`  Already correct: ${wrongId} (${existingStudent.name})`);
              correctIds.push(wrongId);
            } else {
              console.log(`  ⚠️  Student not found: ${wrongId}`);
            }
          }
        }

        if (correctIds.length > 0) {
          await collections.teacher_assignments().updateOne(
            { assignment_id: assignment.assignment_id },
            { $set: { student_ids: correctIds, updated_at: new Date().toISOString() } }
          );
          console.log(`  ✅ Updated assignment ${assignment.assignment_id}`);
        }
      }
    }

    console.log('✅ All teacher assignments fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTeacherAssignments();
