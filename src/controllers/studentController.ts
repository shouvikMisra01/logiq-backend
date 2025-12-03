// src/controllers/studentController.ts
/**
 * Student Controller - HTTP Request Handlers
 */

import { Request, Response } from 'express';
import { StudentService } from '../services/studentService';

export const listStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = (req.query.school_id as string) || null;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    const students = await StudentService.listStudents(schoolId, skip, limit);
    res.json({ students, count: students.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createStudent = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const result = await StudentService.createStudent(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'School not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Student with this email already exists') {
      return res.status(400).json({
        detail: 'Student with this email already exists',
        errors: [
          {
            field: 'email',
            message: 'Student with this email already exists',
            type: 'value_error',
          },
        ],
        validation_errors: true,
      });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getStudent = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const student = await StudentService.getStudentById(req.params.id);
    res.json(student);
  } catch (error: any) {
    if (error.message === 'Student not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateStudent = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const result = await StudentService.updateStudent(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Student not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteStudent = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const result = await StudentService.deleteStudent(req.params.id);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Student not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};
