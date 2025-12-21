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

export type UserRole = 'super_admin' | 'school_admin' | 'student' | 'parent' | 'teacher';

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

      // Fetch class details to get the actual class number
      const classesCol = collections.classes();
      const classDoc = await classesCol.findOne({ class_id: student.class_id }); // or _id depending on schema, usually class_id is custom ID

      // Logic to determine class number:
      // 1. From Class Document if found (preferred)
      // 2. From parsing the class_id string itself (fallback for "Class 9" format)
      let classNumber = 0;

      if (classDoc) {
        classNumber = classDoc.class_number || (classDoc.name ? parseInt(classDoc.name.replace(/\D/g, ''), 10) : 0) || 0;
      } else if (student.class_id && typeof student.class_id === 'string') {
        // Fallback: If class_id is "Class 9", extract 9 directly
        const match = student.class_id.match(/\d+/);
        if (match) {
          classNumber = parseInt(match[0], 10);
        }
      }

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

    // 2) Try to find user in super_admins collection
    const superAdminsCol = collections.super_admins();
    const superAdmin = await superAdminsCol.findOne({ email });

    if (superAdmin) {
      // Verify password
      if (!this.verifyPassword(password, superAdmin.password_hash)) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT for super admin
      const token = this.generateToken({
        userId: superAdmin.admin_id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: 'super_admin',
      });

      return {
        token,
        user: {
          userId: superAdmin.admin_id,
          name: superAdmin.name,
          email: superAdmin.email,
          role: 'super_admin',
        },
      };
    }

    // 3) Try to find user in school_admins collection
    const schoolAdminsCol = collections.school_admins();
    const schoolAdmin = await schoolAdminsCol.findOne({ email });

    if (schoolAdmin) {
      // Verify password
      if (!this.verifyPassword(password, schoolAdmin.password_hash)) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT for school admin
      const token = this.generateToken({
        userId: schoolAdmin.admin_id,
        email: schoolAdmin.email,
        name: schoolAdmin.name,
        role: 'school_admin',
        schoolId: schoolAdmin.school_id,
      });

      return {
        token,
        user: {
          userId: schoolAdmin.admin_id,
          name: schoolAdmin.name,
          email: schoolAdmin.email,
          role: 'school_admin',
          schoolId: schoolAdmin.school_id,
        },
      };
    }

    // 4) Try to find user in parents collection
    const parentsCol = collections.parents();
    const parent: Parent | null = await parentsCol.findOne({ email }) as Parent | null;

    if (parent) {
      // Verify password
      if (!this.verifyPassword(password, parent.password_hash)) {
        throw new Error('Invalid email or password');
      }

      // Fetch fresh class details to ensure correct class number
      const classesCol = collections.classes();
      // Assuming child_class_label stores the class_id or we need to find the student to get the class_id
      // Let's first fetch the student to be sure about class_id
      const studentsCol = collections.students();
      const childStudent = await studentsCol.findOne({ student_id: parent.child_student_id });

      let finalClassNumber = parent.child_class_number || 0;
      let finalClassLabel = parent.child_class_label;

      if (childStudent) {
        finalClassLabel = childStudent.class_id;
        const classDoc = await classesCol.findOne({ class_id: childStudent.class_id });
        finalClassNumber = classDoc?.class_number || (classDoc?.name ? parseInt(classDoc.name.replace(/\D/g, ''), 10) : 0) || 0;
      }

      // Generate JWT for parent (includes child info)
      const token = this.generateToken({
        userId: parent.parent_id,
        email: parent.email,
        name: parent.name,
        role: 'parent',
        schoolId: parent.school_id,
        classLabel: finalClassLabel,
        classNumber: finalClassNumber,
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

    // 5) Try to find user in teachers collection
    const teachersCol = collections.teachers();
    const teacher = await teachersCol.findOne({ email });

    if (teacher) {
      // Verify password
      if (!this.verifyPassword(password, teacher.password_hash)) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT for teacher (all teacher types are authenticated as 'teacher' role)
      const token = this.generateToken({
        userId: teacher.teacher_id,
        email: teacher.email,
        name: teacher.name,
        role: 'teacher',
        schoolId: teacher.school_id,
      });

      return {
        token,
        user: {
          userId: teacher.teacher_id,
          name: teacher.name,
          email: teacher.email,
          role: 'teacher',
          schoolId: teacher.school_id,
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

  /**
   * Request Password Reset
   */
  static async requestPasswordReset(email: string): Promise<boolean> {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    // Helper to update any user collection
    const updateToken = async (collection: any) => {
      const result = await collection.updateOne(
        { email },
        { $set: { reset_token: token, reset_expires: expires } }
      );
      return result.matchedCount > 0;
    };

    // Try all collections
    let found = await updateToken(collections.students());
    if (!found) found = await updateToken(collections.super_admins());
    if (!found) found = await updateToken(collections.school_admins());
    if (!found) found = await updateToken(collections.teachers());
    if (!found) found = await updateToken(collections.parents());

    if (found) {
      // Send email (import dynamically to avoid circular dep if any, or just import at top)
      const { EmailService } = await import('./emailService');
      await EmailService.sendPasswordReset(email, token);
      return true;
    }

    return false;
  }

  /**
   * Reset Password with Token
   */
  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const hashed = this.hashPassword(newPassword);

    // Find user with valid token
    const query = {
      reset_token: token,
      reset_expires: { $gt: new Date() }
    };

    const update = {
      $set: { password_hash: hashed, is_verified: true },
      $unset: { reset_token: "", reset_expires: "" }
    };

    // Helper to update
    const attemptReset = async (collection: any) => {
      const result = await collection.updateOne(query, update);
      return result.modifiedCount > 0;
    };

    if (await attemptReset(collections.students())) return true;
    if (await attemptReset(collections.super_admins())) return true;
    if (await attemptReset(collections.school_admins())) return true;
    if (await attemptReset(collections.teachers())) return true;
    if (await attemptReset(collections.parents())) return true;

    throw new Error('Invalid or expired reset token');
  }

  /**
   * Verify Invite Token
   */
  static async verifyInviteToken(token: string): Promise<{ valid: boolean; email?: string; role?: string }> {
    const query = {
      invite_token: token,
      invite_expires: { $gt: new Date() }
    };

    // Helper
    const findUser = async (collection: any, roleName: string) => {
      const user = await collection.findOne(query);
      if (user) return { valid: true, email: user.email, role: roleName };
      return null;
    };

    let result = await findUser(collections.teachers(), 'teacher');
    if (result) return result;

    result = await findUser(collections.students(), 'student');
    if (result) return result;

    result = await findUser(collections.parents(), 'parent');
    if (result) return result;

    result = await findUser(collections.school_admins(), 'school_admin');
    if (result) return result;

    return { valid: false };
  }

  /**
   * Complete Invite (Set Password)
   */
  static async completeInvite(token: string, password: string): Promise<boolean> {
    const hashed = this.hashPassword(password);

    const query = {
      invite_token: token,
      invite_expires: { $gt: new Date() }
    };

    const update = {
      $set: { password_hash: hashed, is_verified: true, status: 'active' },
      $unset: { invite_token: "", invite_expires: "" }
    };

    const attemptUpdate = async (collection: any) => {
      const res = await collection.updateOne(query, update);
      return res.modifiedCount > 0;
    };

    if (await attemptUpdate(collections.teachers())) return true;
    if (await attemptUpdate(collections.students())) return true;
    if (await attemptUpdate(collections.parents())) return true;
    if (await attemptUpdate(collections.school_admins())) return true;

    throw new Error('Invalid or expired invite token');
  }
}

// ----------------- Optional functional wrapper -----------------

// If some code imports { login } from this file, this keeps it working:
export async function login(email: string, password: string): Promise<LoginResult> {
  return AuthService.login(email, password);
}
