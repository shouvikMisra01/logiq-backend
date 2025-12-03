// backend/src/services/authService.ts
/**
 * Authentication Service - JWT generation and verification
 */

import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { collections } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// ----------------- Types & Interfaces -----------------

export type UserRole = 'super_admin' | 'school_admin' | 'student' | 'parent';

export interface Parent {
  _id: ObjectId;
  parent_id: string;
  name: string;
  email: string;
  password_hash: string;
  school_id: string;
  child_student_id: string;      // or number, depending on your student schema
  child_name: string;
  child_class_label: string;     // e.g. "Class 9"
  child_class_number: number;    // e.g. 9
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId?: string;
  classLabel?: string;
  classNumber?: number;

  // extra fields for parent
  childStudentId?: string;
  childName?: string;
}

export interface LoginResult {
  token: string;
  user: {
    userId: string;
    email: string;
    name: string;
    role: UserRole;
    schoolId?: string;
    classLabel?: string;
    classNumber?: number;
    childStudentId?: string;
    childName?: string;
  };
}

// ----------------- Service -----------------

export class AuthService {
  /**
   * Hash password
   */
  static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Verify password
   */
  static verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generic login for all user types (student, school_admin, super_admin, parent)
   */
  static async login(email: string, password: string): Promise<LoginResult> {
    // 1) Try to find user in students collection
    const studentsCol = collections.students();
    const student = await studentsCol.findOne({ email });

    if (student) {
      // Verify password
      if (!this.verifyPassword(password, student.password_hash)) {
        throw new Error('Invalid email or password');
      }

      // Extract class number from class_id (e.g., "Class 8" -> 8)
      const classNumber = parseInt(student.class_id.replace(/\D/g, ''), 10) || 8;

      // Generate JWT for student
      const token = this.generateToken({
        userId: student.student_id,
        email: student.email,
        name: student.name,
        role: 'student',
        schoolId: student.school_id,
        classNumber,
        classLabel: student.class_id,
      });

      return {
        token,
        user: {
          userId: student.student_id,
          name: student.name,
          email: student.email,
          role: 'student',
          schoolId: student.school_id,
          classLabel: student.class_id,
          classNumber,
        },
      };
    }

    // 2) Try to find user in admins collection
    const adminsCol = collections.admins();
    const admin = await adminsCol.findOne({ email });

    if (admin) {
      // Verify password
      if (!this.verifyPassword(password, admin.password_hash)) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT for admin
      const token = this.generateToken({
        userId: admin.admin_id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        schoolId: admin.school_id,
      });

      return {
        token,
        user: {
          userId: admin.admin_id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          schoolId: admin.school_id,
        },
      };
    }

    // 3) Try to find user in parents collection
    const parentsCol = collections.parents();
    const parent: Parent | null = await parentsCol.findOne({ email }) as Parent | null;

    if (parent) {
      // Verify password
      if (!this.verifyPassword(password, parent.password_hash)) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT for parent (includes child info)
      const token = this.generateToken({
        userId: parent.parent_id,
        email: parent.email,
        name: parent.name,
        role: 'parent',
        schoolId: parent.school_id,
        classLabel: parent.child_class_label,
        classNumber: parent.child_class_number,
        childStudentId: parent.child_student_id,
        childName: parent.child_name,
      });

      return {
        token,
        user: {
          userId: parent.parent_id,
          name: parent.name,
          email: parent.email,
          role: 'parent',
          schoolId: parent.school_id,
          classLabel: parent.child_class_label,
          classNumber: parent.child_class_number,
          childStudentId: parent.child_student_id,
          childName: parent.child_name,
        },
      };
    }

    throw new Error('Invalid email or password');
  }

  /**
   * Login student with email and password (backward compatibility)
   */
  static async loginStudent(
    email: string,
    password: string
  ): Promise<{
    token: string;
    student: {
      studentId: string;
      name: string;
      email: string;
      classLabel: string;
      classNumber: number;
      schoolId: string;
    };
  }> {
    const result = await this.login(email, password);

    if (result.user.role !== 'student') {
      throw new Error('Invalid email or password');
    }

    return {
      token: result.token,
      student: {
        studentId: result.user.userId,
        name: result.user.name,
        email: result.user.email,
        classLabel: result.user.classLabel!,
        classNumber: result.user.classNumber!,
        schoolId: result.user.schoolId!,
      },
    };
  }
}

// ----------------- Optional functional wrapper -----------------

// If some code imports { login } from this file, this keeps it working:
export async function login(email: string, password: string): Promise<LoginResult> {
  return AuthService.login(email, password);
}
