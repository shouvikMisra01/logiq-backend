// Add school_name to school_admins and fix data
import { connectDB, collections } from '../config/database';

async function fixSchoolAdmins() {
  try {
    await connectDB();
    console.log('🔧 Fixing school_admins collection...\n');

    // Update school_admin to have school_name
    await collections.school_admins().updateOne(
      { school_id: 'school_001' },
      {
        $set: {
          school_name: 'Greenfield High School',
          updated_at: new Date().toISOString()
        }
      }
    );

    console.log('✅ Updated school_admin with school_name');

    // Verify
    const admin = await collections.school_admins().findOne({ school_id: 'school_001' });
    if (admin) {
      console.log('\n📊 School Admin Data:');
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   School ID: ${admin.school_id}`);
      console.log(`   School Name: ${admin.school_name}`);
    }

    console.log('\n✅ Fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSchoolAdmins();
