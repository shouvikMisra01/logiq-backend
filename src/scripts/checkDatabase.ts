// Check MongoDB Atlas database state
import { connectDB, collections } from '../config/database';

async function checkDatabase() {
  try {
    const { db } = await connectDB();
    console.log('🔍 Checking MongoDB Atlas database...\n');

    // List all collections
    const collectionsList = await db.listCollections().toArray();
    console.log('📚 Collections in database:');
    collectionsList.forEach(col => console.log(`   - ${col.name}`));

    // Check admins collection
    console.log('\n📊 ADMINS COLLECTION:');
    const adminsCount = await collections.admins().countDocuments();
    console.log(`   Count: ${adminsCount}`);
    if (adminsCount > 0) {
      const admins = await collections.admins().find({}).toArray();
      admins.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email}) - Role: ${admin.role} - School: ${admin.school_id || 'N/A'}`);
      });
    }

    // Check super_admins collection
    console.log('\n📊 SUPER_ADMINS COLLECTION:');
    const superAdminsCount = await collections.super_admins().countDocuments();
    console.log(`   Count: ${superAdminsCount}`);
    if (superAdminsCount > 0) {
      const superAdmins = await collections.super_admins().find({}).toArray();
      superAdmins.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email})`);
      });
    }

    // Check school_admins collection
    console.log('\n📊 SCHOOL_ADMINS COLLECTION:');
    const schoolAdminsCount = await collections.school_admins().countDocuments();
    console.log(`   Count: ${schoolAdminsCount}`);
    if (schoolAdminsCount > 0) {
      const schoolAdmins = await collections.school_admins().find({}).toArray();
      schoolAdmins.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email}) - School: ${admin.school_id}`);
      });
    }

    // Check students collection
    console.log('\n📊 STUDENTS COLLECTION:');
    const studentsCount = await collections.students().countDocuments();
    console.log(`   Total Count: ${studentsCount}`);
    const school001Students = await collections.students().countDocuments({ school_id: 'school_001' });
    console.log(`   School 001 Count: ${school001Students}`);

    console.log('\n✅ Database check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase();
