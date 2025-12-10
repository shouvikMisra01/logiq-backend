// Check school and school_admin data
import { connectDB, collections } from '../config/database';

async function checkSchoolData() {
  try {
    await connectDB();
    console.log('🔍 Checking school-related data...\n');

    // Check schools collection
    console.log('📊 SCHOOLS COLLECTION:');
    const schools = await collections.schools().find({}).toArray();
    console.log(`   Count: ${schools.length}`);
    schools.forEach(school => {
      console.log(`   - ${school.school_id}: ${school.school_name}`);
      console.log(`     Students: ${school.current_student_count || 0}`);
    });

    // Check school_admins collection
    console.log('\n📊 SCHOOL_ADMINS COLLECTION:');
    const schoolAdmins = await collections.school_admins().find({}).toArray();
    console.log(`   Count: ${schoolAdmins.length}`);
    schoolAdmins.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.name})`);
      console.log(`     School ID: ${admin.school_id}`);
      console.log(`     School Name: ${admin.school_name || 'NOT SET'}`);
    });

    // Check students
    console.log('\n📊 STUDENTS:');
    const students = await collections.students().find({}).toArray();
    console.log(`   Total: ${students.length}`);
    students.forEach(student => {
      console.log(`   - ${student.name} (${student.email}) - School: ${student.school_id}`);
    });

    console.log('\n✅ Check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSchoolData();
