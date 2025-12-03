// src/services/schoolService.ts
/**
 * School Service - Business Logic Layer
 */

import { collections } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

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

    return {
      success: true,
      school_id: schoolId,
      message: 'School created successfully',
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
   * Delete a school
   */
  static async deleteSchool(schoolId: string): Promise<ServiceResponse> {
    const schoolsCol = collections.schools();

    const school = await schoolsCol.findOne({ school_id: schoolId });
    if (!school) {
      throw new Error('School not found');
    }

    await schoolsCol.deleteOne({ school_id: schoolId });

    return {
      success: true,
      message: 'School deleted successfully',
    };
  }
}
