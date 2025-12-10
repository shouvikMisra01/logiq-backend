import { Request, Response } from 'express';
import { TeacherService } from '../services/teacherService';

export class TeacherController {
  static async listTeachers(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const skip = parseInt(req.query.skip as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await TeacherService.listTeachers(schoolId, skip, limit);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error',
        ...(error.validation_errors && { validation_errors: true, errors: error.errors })
      });
    }
  }

  static async createTeacher(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const result = await TeacherService.createTeacher(schoolId, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error',
        ...(error.validation_errors && { validation_errors: true, errors: error.errors })
      });
    }
  }

  static async updateTeacher(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const result = await TeacherService.updateTeacher(teacherId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error',
        ...(error.validation_errors && { validation_errors: true, errors: error.errors })
      });
    }
  }

  static async deleteTeacher(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const result = await TeacherService.deleteTeacher(teacherId);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error'
      });
    }
  }

  static async listAssignments(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const result = await TeacherService.listAssignmentsForTeacher(teacherId);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error'
      });
    }
  }

  static async createAssignment(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const result = await TeacherService.createAssignment(teacherId, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error',
        ...(error.validation_errors && { validation_errors: true, errors: error.errors })
      });
    }
  }

  static async updateAssignment(req: Request, res: Response) {
    try {
      const { teacherId, assignmentId } = req.params;
      const result = await TeacherService.updateAssignment(teacherId, assignmentId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error',
        ...(error.validation_errors && { validation_errors: true, errors: error.errors })
      });
    }
  }

  static async deleteAssignment(req: Request, res: Response) {
    try {
      const { teacherId, assignmentId } = req.params;
      const result = await TeacherService.deleteAssignment(teacherId, assignmentId);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error'
      });
    }
  }

  static async getClassesForSchool(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const result = await TeacherService.getClassesForSchool(schoolId);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error'
      });
    }
  }

  static async getSubjectsForClass(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const classId = req.query.class_id as string;
      const result = await TeacherService.getSubjectsForClass(schoolId, classId);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error'
      });
    }
  }

  static async getStudentsForFilter(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const classId = req.query.class_id as string;
      const subjectId = req.query.subject_id as string;
      const search = req.query.search as string;
      const skip = parseInt(req.query.skip as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await TeacherService.getStudentsForFilter(
        schoolId,
        classId,
        subjectId,
        search,
        skip,
        limit
      );
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error'
      });
    }
  }

  static async getAssignedStudentsPerformance(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const result = await TeacherService.getAssignedStudentsPerformance(teacherId);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.detail || error.message || 'Internal server error'
      });
    }
  }
}
