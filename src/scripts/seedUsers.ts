// src/scripts/seedUsers.ts
/**
 * Seed script to create test users for all 3 dashboards
 */

import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { connectDB, collections } from '../config/database';

// Hash password using SHA-256 (same as AuthService)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function seedUsers() {
  try {
    console.log('🌱 Starting user seeding...\n');

    // Connect to MongoDB
    await connectDB();

    const schoolsCol = collections.schools();
    const studentsCol = collections.students();
    const adminsCol = collections.admins();
    const parentsCol = collections.parents();

    // ============================================================
    // 1. CREATE TEST SCHOOL
    // ============================================================
    console.log('📚 Creating test school...');

    const testSchool = {
      school_id: 'school_001',
      name: 'Greenfield High School',
      city: 'Mumbai',
      state: 'Maharashtra',
      contact_email: 'admin@greenfield.edu',
      contact_phone: '+91-9876543210',
      principal_name: 'Dr. Rajesh Kumar',
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Check if school already exists
    const existingSchool = await schoolsCol.findOne({ school_id: testSchool.school_id });
    if (existingSchool) {
      console.log('✅ School already exists: Greenfield High School');
    } else {
      await schoolsCol.insertOne(testSchool);
      console.log('✅ Created school: Greenfield High School (school_001)');
    }

    // ============================================================
    // 2. CREATE TEST STUDENT
    // ============================================================
    console.log('\n👨‍🎓 Creating test student...');

    const testStudent = {
      student_id: 'student_001',
      name: 'Aditi Sharma',
      email: 'aditi@student.com',
      password_hash: hashPassword('student123'), // Password: student123
      class_id: 'Class 9',
      school_id: 'school_001',
      date_of_birth: '2010-05-15',
      enrollment_date: new Date('2023-04-01'),
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Check if student already exists (by student_id or email)
    const existingStudent = await studentsCol.findOne({
      $or: [{ student_id: testStudent.student_id }, { email: testStudent.email }],
    });

    if (existingStudent) {
      // Update existing student with new credentials
      await studentsCol.updateOne(
        { student_id: testStudent.student_id },
        {
          $set: {
            email: testStudent.email,
            password_hash: testStudent.password_hash,
            name: testStudent.name,
            class_id: testStudent.class_id,
            school_id: testStudent.school_id,
            updated_at: new Date(),
          },
        }
      );
      console.log('✅ Updated existing student: Aditi Sharma (aditi@student.com)');
    } else {
      await studentsCol.insertOne(testStudent);
      console.log('✅ Created student: Aditi Sharma');
    }

    // ============================================================
    // 3. CREATE SUPER ADMIN
    // ============================================================
    console.log('\n👑 Creating super admin...');

    const testSuperAdmin = {
      admin_id: 'admin_super_001',
      name: 'Super Admin',
      email: 'admin@logiq.com',
      password_hash: hashPassword('admin123'), // Password: admin123
      role: 'super_admin' as const,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const existingSuperAdmin = await adminsCol.findOne({
      $or: [{ admin_id: testSuperAdmin.admin_id }, { email: testSuperAdmin.email }],
    });

    if (existingSuperAdmin) {
      await adminsCol.updateOne(
        { admin_id: testSuperAdmin.admin_id },
        {
          $set: {
            email: testSuperAdmin.email,
            password_hash: testSuperAdmin.password_hash,
            name: testSuperAdmin.name,
            role: testSuperAdmin.role,
            updated_at: new Date(),
          },
        }
      );
      console.log('✅ Updated existing super admin: admin@logiq.com');
    } else {
      await adminsCol.insertOne(testSuperAdmin);
      console.log('✅ Created super admin: Super Admin');
    }

    // ============================================================
    // 4. CREATE SCHOOL ADMIN
    // ============================================================
    console.log('\n🏫 Creating school admin...');

    const testSchoolAdmin = {
      admin_id: 'admin_school_001',
      name: 'School Admin',
      email: 'admin@greenfield.edu',
      password_hash: hashPassword('admin123'), // Password: admin123
      role: 'school_admin' as const,
      school_id: 'school_001',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const existingSchoolAdmin = await adminsCol.findOne({
      $or: [{ admin_id: testSchoolAdmin.admin_id }, { email: testSchoolAdmin.email }],
    });

    if (existingSchoolAdmin) {
      await adminsCol.updateOne(
        { admin_id: testSchoolAdmin.admin_id },
        {
          $set: {
            email: testSchoolAdmin.email,
            password_hash: testSchoolAdmin.password_hash,
            name: testSchoolAdmin.name,
            role: testSchoolAdmin.role,
            school_id: testSchoolAdmin.school_id,
            updated_at: new Date(),
          },
        }
      );
      console.log('✅ Updated existing school admin: admin@greenfield.edu');
    } else {
      await adminsCol.insertOne(testSchoolAdmin);
      console.log('✅ Created school admin: School Admin');
    }

    // ============================================================
    // 5. CREATE DEMO PARENT FOR ADITI
    // ============================================================
    console.log('\n👪 Creating demo parent for Aditi...');

    const testParent = {
      parent_id: 'parent_001',
      name: "Aditi's Parent",
      email: 'parent.aditi@example.com',
      password_hash: hashPassword('parent123'), // Password: parent123
      school_id: 'school_001',
      child_student_id: 'student_001',
      child_name: 'Aditi Sharma',
      child_class_label: 'Class 9',
      child_class_number: 9,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Check if parent already exists
    const existingParent = await parentsCol.findOne({
      $or: [{ parent_id: testParent.parent_id }, { email: testParent.email }],
    });

    if (existingParent) {
      await parentsCol.updateOne(
        { parent_id: testParent.parent_id },
        {
          $set: {
            email: testParent.email,
            password_hash: testParent.password_hash,
            name: testParent.name,
            school_id: testParent.school_id,
            child_student_id: testParent.child_student_id,
            child_name: testParent.child_name,
            child_class_label: testParent.child_class_label,
            child_class_number: testParent.child_class_number,
            updated_at: new Date(),
          },
        }
      );
      console.log("✅ Updated existing parent: Aditi's Parent (parent.aditi@example.com)");
    } else {
      await parentsCol.insertOne(testParent);
      console.log("✅ Created parent: Aditi's Parent");
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 USER SEEDING COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 TEST CREDENTIALS:\n');

    console.log('1️⃣  SUPER ADMIN DASHBOARD (Real JWT Auth)');
    console.log('   Email:    admin@logiq.com');
    console.log('   Password: admin123');
    console.log('   Role:     super_admin\n');

    console.log('2️⃣  SCHOOL ADMIN DASHBOARD (Real JWT Auth)');
    console.log('   Email:    admin@greenfield.edu');
    console.log('   Password: admin123');
    console.log('   Role:     school_admin');
    console.log('   School:   Greenfield High School\n');

    console.log('3️⃣  STUDENT DASHBOARD (Real JWT Auth)');
    console.log('   Email:    aditi@student.com');
    console.log('   Password: student123');
    console.log('   School:   Greenfield High School');
    console.log('   Class:    Class 9\n');

    console.log('4️⃣  PARENT DASHBOARD (Real JWT Auth)');
    console.log('   Email:    parent.aditi@example.com');
    console.log('   Password: parent123');
    console.log('   Role:     parent');
    console.log('   Child:    Aditi Sharma (Class 9)');
    console.log('   School:   Greenfield High School\n');

    console.log('='.repeat(60));
    console.log('✨ You can now login to all 4 dashboards!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
