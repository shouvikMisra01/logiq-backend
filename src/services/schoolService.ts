// src/services/schoolService.ts
/**
 * School Service - Business Logic Layer
 */

import { collections } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface SchoolStats {
  total_schools: number;
  total_students: number;
  active_schools: number;
  avg_students_per_school: number;
}

interface CreateSchoolData {
  school_code: string;
  name: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  subscription_tier?: 'basic' | 'professional' | 'enterprise';
  student_limit?: number;
}

interface UpdateSchoolData {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  subscription_tier?: 'basic' | 'professional' | 'enterprise';
  student_limit?: number;
  subscription_status?: string;
  status?: string;
}

interface School {
  _id?: any;
  school_id: string;
  school_code: string;
  name: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  subscription_tier: string;
  subscription_status: string;
  status: string;
  student_limit: number;
  current_student_count: number;
  created_at: Date;
  updated_at: Date;
}

interface ServiceResponse {
  success: boolean;
  message: string;
  school_id?: string;
}

export class SchoolService {
  /**
   * Get platform statistics
   */
  static async getStats(): Promise<SchoolStats> {
    const schoolsCol = collections.schools();
    const studentsCol = collections.students();

    const totalSchools = await schoolsCol.countDocuments();
    const totalStudents = await studentsCol.countDocuments();
    const activeSchools = await schoolsCol.countDocuments({ status: 'active' });
    const avgStudents = totalSchools > 0 ? (totalStudents / totalSchools).toFixed(1) : '0';

    return {
      total_schools: totalSchools,
      total_students: totalStudents,
      active_schools: activeSchools,
      avg_students_per_school: parseFloat(avgStudents),
    };
  }

  /**
   * List all schools with pagination
   */
  static async listSchools(skip: number = 0, limit: number = 100): Promise<School[]> {
    const schoolsCol = collections.schools();
    const studentsCol = collections.students();

    const schools = await schoolsCol.find({}).skip(skip).limit(limit).toArray();

    // Enrich with student count
    const enrichedSchools = await Promise.all(
      schools.map(async (school) => {
        const studentCount = await studentsCol.countDocuments({
          school_id: school.school_id,
        });
        return {
          ...school,
          current_student_count: studentCount,
        } as School;
      })
    );

    return enrichedSchools;
  }

  /**
   * Create a new school
   */
  static async createSchool(schoolData: CreateSchoolData): Promise<ServiceResponse> {
    const schoolsCol = collections.schools();

    // Check if school code already exists
    const existing = await schoolsCol.findOne({
      school_code: schoolData.school_code.toUpperCase(),
    });

    if (existing) {
      throw new Error('School code already exists');
    }

    // Generate unique school ID
    const schoolId = `school_${uuidv4().substring(0, 12)}`;

    const school: Partial<School> = {
      school_id: schoolId,
      school_code: schoolData.school_code.toUpperCase(),
      name: schoolData.name,
      contact_email: schoolData.contact_email,
      contact_phone: schoolData.contact_phone || null,
      address: schoolData.address || null,
      subscription_tier: schoolData.subscription_tier || 'basic',
      subscription_status: 'trial',
      status: 'active',
      student_limit: schoolData.student_limit || 100,
      current_student_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await schoolsCol.insertOne(school);

    // Create Initial School Admin and Invite
    const adminId = `admin_${uuidv4().substring(0, 8)}`;
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const adminUser = {
      admin_id: adminId,
      school_id: schoolId,
      name: schoolData.name + ' Admin',
      email: schoolData.contact_email,
      role: 'school_admin',
      is_verified: false,
      invite_token: inviteToken,
      invite_expires: inviteExpires,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await collections.school_admins().insertOne(adminUser);

    // Send Invite
    const { EmailService } = await import('./emailService');
    await EmailService.sendInvite(schoolData.contact_email, inviteToken, 'school_admin');

    return {
      success: true,
      school_id: schoolId,
      message: 'School created and invite sent to admin email',
    };
  }

  /**
   * Get a single school by ID
   */
  static async getSchoolById(schoolId: string): Promise<School> {
    const schoolsCol = collections.schools();
    const studentsCol = collections.students();

    const school = await schoolsCol.findOne({ school_id: schoolId });
    if (!school) {
      throw new Error('School not found');
    }

    const studentCount = await studentsCol.countDocuments({ school_id: schoolId });
    (school as any).current_student_count = studentCount;

    return school as School;
  }

  /**
   * Update a school
   */
  static async updateSchool(schoolId: string, updateData: UpdateSchoolData): Promise<ServiceResponse> {
    const schoolsCol = collections.schools();

    const school = await schoolsCol.findOne({ school_id: schoolId });
    if (!school) {
      throw new Error('School not found');
    }

    const updates = { ...updateData, updated_at: new Date() };
    await schoolsCol.updateOne({ school_id: schoolId }, { $set: updates });

    return {
      success: true,
      message: 'School updated successfully',
    };
  }

  /**
   * Delete a school and all related data (CASCADE DELETE)
   */
  static async deleteSchool(schoolId: string): Promise<ServiceResponse> {
    const schoolsCol = collections.schools();
    const schoolAdminsCol = collections.school_admins();
    const teachersCol = collections.teachers();
    const studentsCol = collections.students();
    const parentsCol = collections.parents();
    const teacherAssignmentsCol = collections.teacher_assignments();

    // Check if school exists
    const school = await schoolsCol.findOne({ school_id: schoolId });
    if (!school) {
      throw new Error('School not found');
    }

    // CASCADE DELETE - Delete all related data
    console.log(`🗑️  Starting cascade delete for school: ${schoolId}`);

    // 1. Delete all parents of students in this school
    const parentsResult = await parentsCol.deleteMany({ school_id: schoolId });
    console.log(`   ✓ Deleted ${parentsResult.deletedCount} parents`);

    // 2. Delete all students in this school
    const studentsResult = await studentsCol.deleteMany({ school_id: schoolId });
    console.log(`   ✓ Deleted ${studentsResult.deletedCount} students`);

    // 3. Delete all teacher assignments for this school's teachers
    const teachers = await teachersCol.find({ school_id: schoolId }).toArray();
    const teacherIds = teachers.map(t => t.teacher_id);

    let assignmentsDeleted = 0;
    if (teacherIds.length > 0) {
      const assignmentsResult = await teacherAssignmentsCol.deleteMany({
        teacher_id: { $in: teacherIds }
      });
      assignmentsDeleted = assignmentsResult.deletedCount;
    }
    console.log(`   ✓ Deleted ${assignmentsDeleted} teacher assignments`);

    // 4. Delete all teachers in this school
    const teachersResult = await teachersCol.deleteMany({ school_id: schoolId });
    console.log(`   ✓ Deleted ${teachersResult.deletedCount} teachers`);

    // 5. Delete school admin
    const schoolAdminsResult = await schoolAdminsCol.deleteMany({ school_id: schoolId });
    console.log(`   ✓ Deleted ${schoolAdminsResult.deletedCount} school admins`);

    // 6. Finally, delete the school itself
    await schoolsCol.deleteOne({ school_id: schoolId });
    console.log(`   ✓ Deleted school: ${schoolId}`);

    console.log(`✅ Cascade delete completed for school: ${schoolId}`);

    return {
      success: true,
      message: `School and all related data deleted successfully. Deleted: ${studentsResult.deletedCount} students, ${parentsResult.deletedCount} parents, ${teachersResult.deletedCount} teachers, ${assignmentsDeleted} assignments, ${schoolAdminsResult.deletedCount} admins`,
    };
  }
}
