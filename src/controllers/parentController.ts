// src/controllers/parentController.ts
/**
 * Parent Controller - HTTP Request Handlers
 */

import { Request, Response } from 'express';
import { ParentService } from '../services/parentService';

export const listParents = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = (req.query.school_id as string) || null;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    const parents = await ParentService.listParents(schoolId, skip, limit);
    res.json({ parents, count: parents.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createParent = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const result = await ParentService.createParent(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'School not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Student not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Parent with this email already exists') {
      return res.status(400).json({
        detail: 'Parent with this email already exists',
        errors: [
          {
            field: 'email',
            message: 'Parent with this email already exists',
            type: 'value_error',
          },
        ],
        validation_errors: true,
      });
    }
    if (error.message === 'This student already has a parent account') {
      return res.status(400).json({
        detail: 'This student already has a parent account',
        errors: [
          {
            field: 'child_student_id',
            message: 'This student already has a parent account',
            type: 'value_error',
          },
        ],
        validation_errors: true,
      });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getParent = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const parent = await ParentService.getParentById(req.params.id);
    res.json(parent);
  } catch (error: any) {
    if (error.message === 'Parent not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getParentByStudent = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const studentId = req.params.studentId;
    const parent = await ParentService.getParentByStudentId(studentId);

    if (!parent) {
      return res.status(404).json({ error: 'No parent found for this student' });
    }

    res.json(parent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateParent = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const result = await ParentService.updateParent(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Parent not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Parent with this email already exists') {
      return res.status(400).json({
        detail: 'Parent with this email already exists',
        errors: [
          {
            field: 'email',
            message: 'Parent with this email already exists',
            type: 'value_error',
          },
        ],
        validation_errors: true,
      });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteParent = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const result = await ParentService.deleteParent(req.params.id);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Parent not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};
