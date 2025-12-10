// Check student and parent creation
import { connectDB, collections } from '../config/database';

async function checkStudentAndParent() {
  try {
    await connectDB();
    console.log('🔍 Checking student and parent creation...\n');

    const studentId = 'student_c3f228d2-023';

    // Find the student
    const student = await collections.students().findOne({ student_id: studentId });

    if (student) {
      console.log('✅ Student Found:');
      console.log(`   Student ID: ${student.student_id}`);
      console.log(`   Name: ${student.name}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   Class: ${student.class_id}`);
      console.log(`   School ID: ${student.school_id}\n`);

      // Find the parent linked to this student
      const parent = await collections.parents().findOne({ child_student_id: studentId });

      if (parent) {
        console.log('✅ Parent Found:');
        console.log(`   Parent ID: ${parent.parent_id}`);
        console.log(`   Name: ${parent.name}`);
        console.log(`   Email: ${parent.email}`);
        console.log(`   Child Student ID: ${parent.child_student_id}`);
        console.log(`   Child Name: ${parent.child_name}`);
        console.log(`   School ID: ${parent.school_id}`);
        console.log(`   Has Password: ${parent.password_hash ? 'Yes' : 'No'}\n`);
      } else {
        console.log('❌ Parent NOT found for this student\n');
      }
    } else {
      console.log('❌ Student NOT found\n');
    }

    console.log('✅ Verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStudentAndParent();
