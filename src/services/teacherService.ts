import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { collections } from '../config/database';
import { TeacherDoc, TeacherAssignmentDoc } from '../types/teacher';

// Auth assumption: Teacher creation returns temp password; caller should create user entry separately or integrate with existing auth service

export class TeacherService {
  static async listTeachers(schoolId: string, skip = 0, limit = 50) {
    const teachers = await collections.teachers()
      .find({ school_id: schoolId })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collections.teachers().countDocuments({ school_id: schoolId });

    return { teachers, total, skip, limit };
  }

  static async createTeacher(schoolId: string, payload: { name: string; email: string; role: string }) {
    const { name, email, role } = payload;

    if (!name || !email || !role) {
      throw {
        status: 400,
        detail: 'Validation failed',
        validation_errors: true,
        errors: [
          { field: 'name', message: 'Name is required' },
          { field: 'email', message: 'Email is required' },
          { field: 'role', message: 'Role is required' }
        ].filter(e => !payload[e.field as keyof typeof payload])
      };
    }

    if (!['teacher', 'mentor', 'admin'].includes(role)) {
      throw {
        status: 400,
        detail: 'Invalid role',
        validation_errors: true,
        errors: [{ field: 'role', message: 'Role must be teacher, mentor, or admin' }]
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw {
        status: 400,
        detail: 'Invalid email format',
        validation_errors: true,
        errors: [{ field: 'email', message: 'Invalid email format' }]
      };
    }

    const existing = await collections.teachers().findOne({ school_id: schoolId, email });
    if (existing) {
      throw {
        status: 400,
        detail: 'Email already exists',
        validation_errors: true,
        errors: [{ field: 'email', message: 'Email already exists for this school' }]
      };
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 72 hours

    const teacher: TeacherDoc = {
      teacher_id: uuidv4(),
      school_id: schoolId,
      name,
      email,
      role: role as 'teacher' | 'mentor' | 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_verified: false,
      invite_token: inviteToken,
      invite_expires: inviteExpires,
    };

    await collections.teachers().insertOne(teacher);

    // Send Invite Email
    const { EmailService } = await import('./emailService');
    await EmailService.sendInvite(email, inviteToken, role);

    return { teacher, message: 'Invite sent to teacher email' };
  }

  static async updateTeacher(teacherId: string, payload: Partial<{ name: string; email: string; role: string }>) {
    const { name, email, role } = payload;

    if (role && !['teacher', 'mentor', 'admin'].includes(role)) {
      throw {
        status: 400,
        detail: 'Invalid role',
        validation_errors: true,
        errors: [{ field: 'role', message: 'Role must be teacher, mentor, or admin' }]
      };
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw {
          status: 400,
          detail: 'Invalid email format',
          validation_errors: true,
          errors: [{ field: 'email', message: 'Invalid email format' }]
        };
      }

      const existing = await collections.teachers().findOne({ teacher_id: { $ne: teacherId }, email });
      if (existing) {
        throw {
          status: 400,
          detail: 'Email already exists',
          validation_errors: true,
          errors: [{ field: 'email', message: 'Email already in use' }]
        };
      }
    }

    const updateDoc: any = { updated_at: new Date().toISOString() };
    if (name) updateDoc.name = name;
    if (email) updateDoc.email = email;
    if (role) updateDoc.role = role;

    const result = await collections.teachers().updateOne(
      { teacher_id: teacherId },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      throw { status: 404, detail: 'Teacher not found' };
    }

    const teacher = await collections.teachers().findOne({ teacher_id: teacherId });
    return { teacher };
  }

  static async deleteTeacher(teacherId: string) {
    const result = await collections.teachers().deleteOne({ teacher_id: teacherId });

    if (result.deletedCount === 0) {
      throw { status: 404, detail: 'Teacher not found' };
    }

    await collections.teacher_assignments().deleteMany({ teacher_id: teacherId });

    return { success: true };
  }

  static async listAssignmentsForTeacher(teacherId: string) {
    const assignments = await collections.teacher_assignments()
      .find({ teacher_id: teacherId })
      .toArray();

    return { assignments };
  }

  static async createAssignment(teacherId: string, payload: {
    type: string;
    school_id: string;
    class_ids?: string[];
    subject_map?: { class_id: string; subject_id: string }[];
    student_ids?: string[];
  }) {
    const { type, school_id, class_ids, subject_map, student_ids } = payload;

    if (!type || !school_id) {
      throw {
        status: 400,
        detail: 'Validation failed',
        validation_errors: true,
        errors: [
          { field: 'type', message: 'Type is required' },
          { field: 'school_id', message: 'School ID is required' }
        ].filter(e => !payload[e.field as keyof typeof payload])
      };
    }

    if (!['class', 'subject', 'manual'].includes(type)) {
      throw {
        status: 400,
        detail: 'Invalid type',
        validation_errors: true,
        errors: [{ field: 'type', message: 'Type must be class, subject, or manual' }]
      };
    }

    if (type === 'class' && (!class_ids || class_ids.length === 0)) {
      throw {
        status: 400,
        detail: 'Class IDs required',
        validation_errors: true,
        errors: [{ field: 'class_ids', message: 'At least one class is required for class type' }]
      };
    }

    if (type === 'subject' && (!subject_map || subject_map.length === 0)) {
      throw {
        status: 400,
        detail: 'Subject map required',
        validation_errors: true,
        errors: [{ field: 'subject_map', message: 'At least one subject mapping is required' }]
      };
    }

    if (type === 'manual' && (!student_ids || student_ids.length === 0)) {
      throw {
        status: 400,
        detail: 'Student IDs required',
        validation_errors: true,
        errors: [{ field: 'student_ids', message: 'At least one student is required for manual type' }]
      };
    }

    const assignment: TeacherAssignmentDoc = {
      assignment_id: uuidv4(),
      teacher_id: teacherId,
      school_id,
      type: type as 'class' | 'subject' | 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (class_ids) assignment.class_ids = class_ids;
    if (subject_map) assignment.subject_map = subject_map;
    if (student_ids) assignment.student_ids = student_ids;

    await collections.teacher_assignments().insertOne(assignment);

    return { assignment };
  }

  static async updateAssignment(teacherId: string, assignmentId: string, payload: Partial<{
    class_ids: string[];
    subject_map: { class_id: string; subject_id: string }[];
    student_ids: string[];
  }>) {
    const updateDoc: any = { updated_at: new Date().toISOString() };

    if (payload.class_ids) updateDoc.class_ids = payload.class_ids;
    if (payload.subject_map) updateDoc.subject_map = payload.subject_map;
    if (payload.student_ids) updateDoc.student_ids = payload.student_ids;

    const result = await collections.teacher_assignments().updateOne(
      { assignment_id: assignmentId, teacher_id: teacherId },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      throw { status: 404, detail: 'Assignment not found' };
    }

    const assignment = await collections.teacher_assignments().findOne({ assignment_id: assignmentId });
    return { assignment };
  }

  static async deleteAssignment(teacherId: string, assignmentId: string) {
    const result = await collections.teacher_assignments().deleteOne({
      assignment_id: assignmentId,
      teacher_id: teacherId
    });

    if (result.deletedCount === 0) {
      throw { status: 404, detail: 'Assignment not found' };
    }

    return { success: true };
  }

  static async getClassesForSchool(schoolId: string) {
    const classes = await collections.chapters()
      .aggregate([
        { $match: { school_id: schoolId } },
        { $group: { _id: '$class_id' } },
        { $sort: { _id: 1 } }
      ])
      .toArray();

    return { classes: classes.map(c => ({ class_id: c._id })) };
  }

  static async getSubjectsForClass(schoolId: string, classId: string) {
    if (!classId) {
      throw { status: 400, detail: 'class_id query parameter is required' };
    }

    const subjects = await collections.chapters()
      .aggregate([
        { $match: { school_id: schoolId, class_id: classId } },
        { $group: { _id: '$subject_id' } },
        { $sort: { _id: 1 } }
      ])
      .toArray();

    return { subjects: subjects.map(s => ({ subject_id: s._id })) };
  }

  static async getStudentsForFilter(
    schoolId: string,
    classId?: string,
    subjectId?: string,
    search?: string,
    skip = 0,
    limit = 50
  ) {
    const filter: any = { school_id: schoolId };

    if (classId) filter.class_id = classId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { roll: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await collections.students()
      .find(filter)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collections.students().countDocuments(filter);

    return { students, total, skip, limit };
  }

  static async getAssignedStudentsPerformance(teacherId: string) {
    // Get all assignments for this teacher
    const assignments = await collections.teacher_assignments()
      .find({ teacher_id: teacherId })
      .toArray();

    if (assignments.length === 0) {
      return { students: [], totalStudents: 0, averageScore: 0 };
    }

    // Collect all student IDs from assignments
    const studentIdsSet = new Set<string>();
    assignments.forEach((assignment: any) => {
      if (assignment.student_ids) {
        assignment.student_ids.forEach((id: string) => studentIdsSet.add(id));
      }
    });

    const studentIds = Array.from(studentIdsSet);

    if (studentIds.length === 0) {
      return { students: [], totalStudents: 0, averageScore: 0 };
    }

    // Fetch student data
    const students = await collections.students()
      .find({ student_id: { $in: studentIds } })
      .toArray();

    // Fetch quiz results for these students (using question_set_attempts)
    const quizResults = await collections.question_set_attempts()
      .find({ student_id: { $in: studentIds } })
      .toArray();

    // Calculate performance for each student
    const studentsWithPerformance = students.map((student: any) => {
      const studentQuizzes = quizResults.filter((q: any) => q.student_id === student.student_id);

      const totalQuizzes = studentQuizzes.length;
      const totalScore = studentQuizzes.reduce((sum: number, q: any) => sum + (q.score || 0), 0);
      const averageScore = totalQuizzes > 0 ? totalScore / totalQuizzes : 0;

      // Calculate subject-wise performance
      const subjectPerformance: Record<string, { quizzes: number; avgScore: number }> = {};
      studentQuizzes.forEach((quiz: any) => {
        const subject = quiz.subject || 'Unknown';
        if (!subjectPerformance[subject]) {
          subjectPerformance[subject] = { quizzes: 0, avgScore: 0 };
        }
        subjectPerformance[subject].quizzes += 1;
        subjectPerformance[subject].avgScore += quiz.score || 0;
      });

      // Average the subject scores
      Object.keys(subjectPerformance).forEach(subject => {
        const data = subjectPerformance[subject];
        data.avgScore = data.quizzes > 0 ? data.avgScore / data.quizzes : 0;
      });

      return {
        student_id: student.student_id,
        name: student.name,
        email: student.email,
        class_id: student.class_id,
        roll: student.roll,
        totalQuizzes,
        averageScore: Math.round(averageScore * 100) / 100,
        subjectPerformance,
        recentQuizzes: studentQuizzes.slice(-5).map((q: any) => ({
          attempt_id: q.attempt_id,
          question_set_id: q.question_set_id,
          score: q.score,
          max_score: q.max_score,
          completed_at: q.completed_at
        }))
      };
    });

    // Calculate overall average
    const overallAverage = studentsWithPerformance.length > 0
      ? studentsWithPerformance.reduce((sum, s) => sum + s.averageScore, 0) / studentsWithPerformance.length
      : 0;

    return {
      students: studentsWithPerformance,
      totalStudents: studentsWithPerformance.length,
      averageScore: Math.round(overallAverage * 100) / 100
    };
  }
}
