// Migrate admins from single 'admins' collection to separate 'super_admins' and 'school_admins' collections
import { connectDB, collections } from '../config/database';

async function migrateAdmins() {
  try {
    await connectDB();
    console.log('🔧 Migrating admins to separate collections...');

    // Get all admins from old collection
    const admins = await collections.admins().find({}).toArray();

    console.log(`Found ${admins.length} admins to migrate`);

    let superAdminCount = 0;
    let schoolAdminCount = 0;

    for (const admin of admins) {
      if (admin.role === 'super_admin') {
        // Insert into super_admins collection
        await collections.super_admins().insertOne({
          admin_id: admin.admin_id,
          name: admin.name,
          email: admin.email,
          password_hash: admin.password_hash,
          created_at: admin.created_at || new Date().toISOString(),
          updated_at: admin.updated_at || new Date().toISOString(),
        });
        console.log(`  ✅ Migrated super_admin: ${admin.name} (${admin.email})`);
        superAdminCount++;
      } else if (admin.role === 'school_admin') {
        // Insert into school_admins collection
        await collections.school_admins().insertOne({
          admin_id: admin.admin_id,
          name: admin.name,
          email: admin.email,
          password_hash: admin.password_hash,
          school_id: admin.school_id,
          created_at: admin.created_at || new Date().toISOString(),
          updated_at: admin.updated_at || new Date().toISOString(),
        });
        console.log(`  ✅ Migrated school_admin: ${admin.name} (${admin.email}) - School: ${admin.school_id}`);
        schoolAdminCount++;
      } else {
        console.log(`  ⚠️  Unknown role for admin: ${admin.name} (${admin.role})`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Super Admins: ${superAdminCount}`);
    console.log(`   School Admins: ${schoolAdminCount}`);
    console.log(`   Total Migrated: ${superAdminCount + schoolAdminCount}`);

    console.log('\n✅ All admins migrated successfully!');
    console.log('⚠️  Note: Old "admins" collection still exists. Delete it manually after verification.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrateAdmins();
