// src/services/schoolAdminService.ts
/**
 * School Admin Service - Dashboard and school-specific data
 */

import { collections } from '../config/database';

export class SchoolAdminService {
  /**
   * Get dashboard data for school admin
   */
  static async getDashboardData(schoolId: string) {
    const studentsCol = collections.students();
    const teachersCol = collections.teachers();
    const schoolAdminsCol = collections.school_admins();

    // Get school admin info
    const schoolAdmin = await schoolAdminsCol.findOne({ school_id: schoolId });
    if (!schoolAdmin) {
      throw new Error('School not found');
    }

    // Get students count and list
    const students = await studentsCol
      .find({ school_id: schoolId }, { projection: { password_hash: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    const studentCount = students.length;

    // Get teachers count
    const teachersCount = await teachersCol.countDocuments({ school_id: schoolId });

    // Get recent students (last 5)
    const recentStudents = students.slice(0, 5);

    // Calculate class distribution
    const classCounts: Record<string, number> = {};
    students.forEach(student => {
      const classId = student.class_id;
      classCounts[classId] = (classCounts[classId] || 0) + 1;
    });

    const classes = Object.entries(classCounts).map(([class_id, count]) => ({
      class_id,
      student_count: count,
    }));

    return {
      school: {
        school_id: schoolAdmin.school_id,
        school_name: schoolAdmin.school_name,
        admin_email: schoolAdmin.email,
      },
      stats: {
        total_students: studentCount,
        total_teachers: teachersCount,
        total_classes: classes.length,
      },
      classes,
      recent_students: recentStudents,
    };
  }
}
