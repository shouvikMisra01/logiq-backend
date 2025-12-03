// src/services/studentService.ts
/**
 * Student Service - Business Logic Layer
 */

import { collections } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface CreateStudentData {
  school_id: string;
  name: string;
  email: string;
  class_id: string;
  password: string;
  parent_name?: string;
  parent_email?: string;
}

interface UpdateStudentData {
  name?: string;
  email?: string;
  class_id?: string;
  status?: string;
}

interface Student {
  _id?: any;
  student_id: string;
  school_id: string;
  name: string;
  email: string;
  class_id: string;
  password_hash?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface ServiceResponse {
  success: boolean;
  message: string;
  student_id?: string;
}

export class StudentService {
  /**
   * Hash password using SHA-256
   */
  static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Create a new student
   */
  static async createStudent(studentData: CreateStudentData): Promise<ServiceResponse> {
    const studentsCol = collections.students();
    const schoolsCol = collections.schools();
    const parentsCol = collections.parents();

    // Verify school exists
    const school = await schoolsCol.findOne({ school_id: studentData.school_id });
    if (!school) {
      throw new Error('School not found');
    }

    // Check if email already exists
    const existing = await studentsCol.findOne({ email: studentData.email });
    if (existing) {
      throw new Error('Student with this email already exists');
    }

    // If parent email is provided, check if it already exists
    if (studentData.parent_email) {
      const existingParent = await parentsCol.findOne({ email: studentData.parent_email });
      if (existingParent) {
        throw new Error('Parent with this email already exists');
      }
    }

    // Generate unique student ID
    const studentId = `student_${uuidv4().substring(0, 12)}`;

    const student: Partial<Student> = {
      student_id: studentId,
      school_id: studentData.school_id,
      name: studentData.name,
      email: studentData.email,
      class_id: studentData.class_id,
      password_hash: this.hashPassword(studentData.password),
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await studentsCol.insertOne(student);

    // Update school student count
    await schoolsCol.updateOne(
      { school_id: studentData.school_id },
      { $inc: { current_student_count: 1 } }
    );

    // Create parent account if parent information is provided
    if (studentData.parent_name && studentData.parent_email) {
      const parentId = `parent_${uuidv4().substring(0, 12)}`;

      // Extract class number from class_id (e.g., "Class 8" -> 8)
      const classNumber = parseInt(studentData.class_id.replace(/\D/g, ''), 10) || 0;

      // Generate a default password for parent (they should change it later)
      const defaultParentPassword = `Parent@${studentId.substring(8)}`;

      const parent = {
        parent_id: parentId,
        name: studentData.parent_name,
        email: studentData.parent_email,
        password_hash: this.hashPassword(defaultParentPassword),
        school_id: studentData.school_id,
        child_student_id: studentId,
        child_name: studentData.name,
        child_class_label: studentData.class_id,
        child_class_number: classNumber,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await parentsCol.insertOne(parent);

      return {
        success: true,
        student_id: studentId,
        message: `Student created successfully. Parent account created with default password: ${defaultParentPassword}`,
      };
    }

    return {
      success: true,
      student_id: studentId,
      message: 'Student created successfully',
    };
  }

  /**
   * List students with optional school filter
   */
  static async listStudents(schoolId: string | null = null, skip: number = 0, limit: number = 100): Promise<Student[]> {
    const studentsCol = collections.students();

    const query = schoolId ? { school_id: schoolId } : {};
    const students = await studentsCol
      .find(query, { projection: { password_hash: 0 } })
      .skip(skip)
      .limit(limit)
      .toArray();

    return students as Student[];
  }

  /**
   * Get a single student by ID
   */
  static async getStudentById(studentId: string): Promise<Student> {
    const studentsCol = collections.students();

    const student = await studentsCol.findOne(
      { student_id: studentId },
      { projection: { password_hash: 0 } }
    );

    if (!student) {
      throw new Error('Student not found');
    }

    return student as Student;
  }

  /**
   * Update a student
   */
  static async updateStudent(studentId: string, updateData: UpdateStudentData): Promise<ServiceResponse> {
    const studentsCol = collections.students();

    const student = await studentsCol.findOne({ student_id: studentId });
    if (!student) {
      throw new Error('Student not found');
    }

    const updates = { ...updateData, updated_at: new Date() };
    await studentsCol.updateOne({ student_id: studentId }, { $set: updates });

    return {
      success: true,
      message: 'Student updated successfully',
    };
  }

  /**
   * Delete a student
   */
  static async deleteStudent(studentId: string): Promise<ServiceResponse> {
    const studentsCol = collections.students();
    const schoolsCol = collections.schools();

    const student = await studentsCol.findOne({ student_id: studentId });
    if (!student) {
      throw new Error('Student not found');
    }

    const schoolId = (student as any).school_id;

    await studentsCol.deleteOne({ student_id: studentId });

    // Update school student count
    if (schoolId) {
      await schoolsCol.updateOne(
        { school_id: schoolId },
        { $inc: { current_student_count: -1 } }
      );
    }

    return {
      success: true,
      message: 'Student deleted successfully',
    };
  }
}
