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
    const schoolAdminsCol = collections.school_admins();
    const parentsCol = collections.parents();

    // Verify school exists by checking school_admins
    const schoolAdmin = await schoolAdminsCol.findOne({ school_id: studentData.school_id });
    if (!schoolAdmin) {
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

    // Student count is now calculated dynamically from students collection

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

    const student = await studentsCol.findOne({ student_id: studentId });
    if (!student) {
      throw new Error('Student not found');
    }

    await studentsCol.deleteOne({ student_id: studentId });

    // Student count is now calculated dynamically from students collection

    return {
      success: true,
      message: 'Student deleted successfully',
    };
  }

  /**
   * Get comprehensive dashboard statistics for a student
   */
  static async getDashboardStats(studentId: string): Promise<any> {
    const studentsCol = collections.students();
    const newAttemptsCol = collections.question_set_attempts();
    const oldAttemptsCol = collections.quiz_attempts();
    const skillStatsCol = collections.student_skill_stats();
    const syllabusCol = collections.syllabi();

    // Verify student exists
    const student = await studentsCol.findOne({ student_id: studentId });
    if (!student) {
      throw new Error('Student not found');
    }

    // Get quiz attempts from BOTH old and new systems
    const newAttempts = await newAttemptsCol
      .find({ student_id: studentId })
      .sort({ attempted_at: -1 })
      .toArray();

    // Map new student_id format to old integer format
    // e.g., "student_001" -> 1, "student_002" -> 2
    let oldSystemStudentId: number | string = studentId;
    const match = studentId.match(/^student_(\d+)$/);
    if (match) {
      oldSystemStudentId = parseInt(match[1], 10);
    }

    const oldAttempts = await oldAttemptsCol
      .find({ student_id: oldSystemStudentId })
      .sort({ created_at: -1 })
      .toArray();

    // Normalize old attempts to match new format
    const normalizedOldAttempts = oldAttempts.map((att: any) => ({
      attempt_id: att.quiz_id,
      set_id: att.quiz_id,
      student_id: String(att.student_id),
      subject: att.subject || 'Unknown',
      topic: att.chapter || 'Unknown',
      score_percentage: att.score_total * 100, // Old system uses 0-1, new uses 0-100
      correct_count: Math.round((att.score_total || 0) * (att.questions?.length || 10)),
      total_questions: att.questions?.length || 10,
      attempted_at: att.submitted_at || att.created_at,
      is_old_system: true,
      feature_scores: att.feature_scores, // Keep for skills calculation
    }));

    // Merge both attempts
    const attempts = [...newAttempts.map((a: any) => ({ ...a, is_old_system: false })), ...normalizedOldAttempts];

    // Get all skill stats for this student
    const skillStats = await skillStatsCol
      .find({ student_id: studentId })
      .toArray();

    // Calculate overall metrics
    const totalAttempts = attempts.length;
    const totalQuestions = attempts.reduce((sum, att: any) => sum + att.total_questions, 0);
    const totalCorrect = attempts.reduce((sum, att: any) => sum + att.correct_count, 0);
    const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // Calculate subjects studied (unique subjects from both skill stats and quiz attempts)
    const subjectsFromStats = skillStats.map((stat: any) => stat.subject);
    const subjectsFromAttempts = attempts.map((att: any) => att.subject).filter((s: string) => s && s !== 'Unknown');
    const allSubjects = [...new Set([...subjectsFromStats, ...subjectsFromAttempts])];
    const subjectsStudied = allSubjects.length;

    // Get recent attempts (last 10)
    const recentAttempts = attempts.slice(0, 10).map((att: any) => ({
      attempt_id: att.attempt_id,
      set_id: att.set_id,
      subject: att.subject || 'Unknown',
      topic: att.topic || 'Unknown',
      score_percentage: att.score_percentage,
      correct_count: att.correct_count,
      total_questions: att.total_questions,
      attempted_at: att.attempted_at,
    }));

    // Calculate topic performance
    const topicMap = new Map<string, { correct: number; total: number; attempts: number }>();
    attempts.forEach((attempt: any) => {
      const key = attempt.topic || 'Unknown';
      const existing = topicMap.get(key) || { correct: 0, total: 0, attempts: 0 };
      topicMap.set(key, {
        correct: existing.correct + attempt.correct_count,
        total: existing.total + attempt.total_questions,
        attempts: existing.attempts + 1,
      });
    });

    const topicPerformance: any[] = [];
    topicMap.forEach((value, topic) => {
      topicPerformance.push({
        topic,
        attempts: value.attempts,
        correct: value.correct,
        total: value.total,
        accuracy: value.total > 0 ? (value.correct / value.total) * 100 : 0,
      });
    });

    // Sort topics by accuracy
    const strongTopics = topicPerformance
      .filter(t => t.accuracy >= 75)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

    const weakTopics = topicPerformance
      .filter(t => t.accuracy < 75 && t.attempts >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    // Aggregate skills across all subjects (from both new and old systems)
    const skillsMap = new Map<string, any>();

    // Add skills from new Quiz V2 system
    skillStats.forEach((statDoc: any) => {
      statDoc.skills?.forEach((skill: any) => {
        const existing = skillsMap.get(skill.skill_name);
        if (!existing || skill.score > existing.score) {
          skillsMap.set(skill.skill_name, skill);
        }
      });
    });

    // Add skills from old quiz system (feature_scores)
    const oldSystemAttempts = attempts.filter((att: any) => att.is_old_system && att.feature_scores);
    if (oldSystemAttempts.length > 0) {
      // Aggregate feature scores from all old attempts
      const aggregatedFeatures = {
        memorization: 0,
        reasoning: 0,
        numerical: 0,
        language: 0,
      };

      oldSystemAttempts.forEach((att: any) => {
        if (att.feature_scores) {
          aggregatedFeatures.memorization += att.feature_scores.memorization || 0;
          aggregatedFeatures.reasoning += att.feature_scores.reasoning || 0;
          aggregatedFeatures.numerical += att.feature_scores.numerical || 0;
          aggregatedFeatures.language += att.feature_scores.language || 0;
        }
      });

      // Convert to skill format
      const count = oldSystemAttempts.length;
      ['Memorization', 'Reasoning', 'Numerical', 'Language'].forEach((skillName) => {
        const key = skillName.toLowerCase();
        const score = aggregatedFeatures[key as keyof typeof aggregatedFeatures] / count;
        const masteryLevel = score >= 0.8 ? 'expert' : score >= 0.6 ? 'competent' : score >= 0.4 ? 'learner' : 'novice';

        const existing = skillsMap.get(skillName);
        if (!existing || score > existing.score) {
          skillsMap.set(skillName, {
            skill_name: skillName,
            score: score,
            mastery_level: masteryLevel,
            questions_answered: totalQuestions,
          });
        }
      });
    }

    const topSkills = Array.from(skillsMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Calculate study streak (consecutive days with at least one attempt)
    let studyStreak = 0;
    if (attempts.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attemptDates = attempts
        .map((att: any) => {
          const date = new Date(att.attempted_at);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
        .sort((a, b) => b - a);

      const uniqueDates = [...new Set(attemptDates)];

      // Check if there's an attempt today or yesterday to start counting streak
      const oneDayMs = 24 * 60 * 60 * 1000;
      const yesterdayMs = today.getTime() - oneDayMs;

      if (uniqueDates[0] >= yesterdayMs) {
        studyStreak = 1;
        let expectedDate = uniqueDates[0] - oneDayMs;

        for (let i = 1; i < uniqueDates.length; i++) {
          if (uniqueDates[i] === expectedDate) {
            studyStreak++;
            expectedDate -= oneDayMs;
          } else {
            break;
          }
        }
      }
    }

    // Last activity date
    const lastActivity = attempts.length > 0 ? attempts[0].attempted_at : null;

    return {
      student_id: studentId,
      student_name: student.name,
      overall_metrics: {
        total_attempts: totalAttempts,
        total_questions: totalQuestions,
        total_correct: totalCorrect,
        overall_accuracy: parseFloat(overallAccuracy.toFixed(2)),
        subjects_studied: subjectsStudied,
      },
      study_activity: {
        study_streak: studyStreak,
        last_activity: lastActivity,
        total_study_days: [...new Set(attempts.map((att: any) => {
          const date = new Date(att.attempted_at);
          return date.toDateString();
        }))].length,
      },
      recent_attempts: recentAttempts,
      topic_performance: {
        strong_topics: strongTopics,
        weak_topics: weakTopics,
        all_topics: topicPerformance.sort((a, b) => b.accuracy - a.accuracy),
      },
      skills: topSkills,
    };
  }
}
