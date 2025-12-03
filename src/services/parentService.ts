// src/services/parentService.ts
/**
 * Parent Service - Business Logic Layer
 */

import { collections } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface CreateParentData {
  name: string;
  email: string;
  password: string;
  school_id: string;
  child_student_id: string;
  child_name: string;
  child_class_label: string;
  child_class_number: number;
}

interface UpdateParentData {
  name?: string;
  email?: string;
  child_name?: string;
  child_class_label?: string;
  child_class_number?: number;
}

interface Parent {
  _id?: any;
  parent_id: string;
  name: string;
  email: string;
  password_hash?: string;
  school_id: string;
  child_student_id: string;
  child_name: string;
  child_class_label: string;
  child_class_number: number;
  created_at: Date;
  updated_at: Date;
}

interface ServiceResponse {
  success: boolean;
  message: string;
  parent_id?: string;
}

export class ParentService {
  /**
   * Hash password using SHA-256
   */
  static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Create a new parent
   */
  static async createParent(parentData: CreateParentData): Promise<ServiceResponse> {
    const parentsCol = collections.parents();
    const schoolsCol = collections.schools();
    const studentsCol = collections.students();

    // Verify school exists
    const school = await schoolsCol.findOne({ school_id: parentData.school_id });
    if (!school) {
      throw new Error('School not found');
    }

    // Verify student exists
    const student = await studentsCol.findOne({ student_id: parentData.child_student_id });
    if (!student) {
      throw new Error('Student not found');
    }

    // Check if email already exists in parents
    const existingParent = await parentsCol.findOne({ email: parentData.email });
    if (existingParent) {
      throw new Error('Parent with this email already exists');
    }

    // Check if this student already has a parent
    const existingParentForStudent = await parentsCol.findOne({
      child_student_id: parentData.child_student_id
    });
    if (existingParentForStudent) {
      throw new Error('This student already has a parent account');
    }

    // Generate unique parent ID
    const parentId = `parent_${uuidv4().substring(0, 12)}`;

    const parent: Partial<Parent> = {
      parent_id: parentId,
      name: parentData.name,
      email: parentData.email,
      password_hash: this.hashPassword(parentData.password),
      school_id: parentData.school_id,
      child_student_id: parentData.child_student_id,
      child_name: parentData.child_name,
      child_class_label: parentData.child_class_label,
      child_class_number: parentData.child_class_number,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await parentsCol.insertOne(parent);

    return {
      success: true,
      parent_id: parentId,
      message: 'Parent created successfully',
    };
  }

  /**
   * List parents with optional school filter
   */
  static async listParents(schoolId: string | null = null, skip: number = 0, limit: number = 100): Promise<Parent[]> {
    const parentsCol = collections.parents();

    const query = schoolId ? { school_id: schoolId } : {};
    const parents = await parentsCol
      .find(query, { projection: { password_hash: 0 } })
      .skip(skip)
      .limit(limit)
      .toArray();

    return parents as Parent[];
  }

  /**
   * Get a single parent by ID
   */
  static async getParentById(parentId: string): Promise<Parent> {
    const parentsCol = collections.parents();

    const parent = await parentsCol.findOne(
      { parent_id: parentId },
      { projection: { password_hash: 0 } }
    );

    if (!parent) {
      throw new Error('Parent not found');
    }

    return parent as Parent;
  }

  /**
   * Get parent by child student ID
   */
  static async getParentByStudentId(studentId: string): Promise<Parent | null> {
    const parentsCol = collections.parents();

    const parent = await parentsCol.findOne(
      { child_student_id: studentId },
      { projection: { password_hash: 0 } }
    );

    return parent as Parent | null;
  }

  /**
   * Update a parent
   */
  static async updateParent(parentId: string, updateData: UpdateParentData): Promise<ServiceResponse> {
    const parentsCol = collections.parents();

    const parent = await parentsCol.findOne({ parent_id: parentId });
    if (!parent) {
      throw new Error('Parent not found');
    }

    // If email is being updated, check it doesn't conflict
    if (updateData.email && updateData.email !== (parent as any).email) {
      const existingParent = await parentsCol.findOne({ email: updateData.email });
      if (existingParent) {
        throw new Error('Parent with this email already exists');
      }
    }

    const updates = { ...updateData, updated_at: new Date() };
    await parentsCol.updateOne({ parent_id: parentId }, { $set: updates });

    return {
      success: true,
      message: 'Parent updated successfully',
    };
  }

  /**
   * Delete a parent
   */
  static async deleteParent(parentId: string): Promise<ServiceResponse> {
    const parentsCol = collections.parents();

    const parent = await parentsCol.findOne({ parent_id: parentId });
    if (!parent) {
      throw new Error('Parent not found');
    }

    await parentsCol.deleteOne({ parent_id: parentId });

    return {
      success: true,
      message: 'Parent deleted successfully',
    };
  }
}
