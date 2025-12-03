// src/controllers/schoolController.ts
/**
 * School Controller - HTTP Request Handlers
 */

import { Request, Response } from 'express';
import { SchoolService } from '../services/schoolService';

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await SchoolService.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const listSchools = async (req: Request, res: Response): Promise<void> => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    const schools = await SchoolService.listSchools(skip, limit);
    res.json({ schools, count: schools.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createSchool = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const result = await SchoolService.createSchool(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'School code already exists') {
      return res.status(400).json({
        detail: 'School code already exists',
        errors: [
          {
            field: 'school_code',
            message: 'School code already exists',
            type: 'value_error',
          },
        ],
        validation_errors: true,
      });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getSchool = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const school = await SchoolService.getSchoolById(req.params.id);
    res.json(school);
  } catch (error: any) {
    if (error.message === 'School not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateSchool = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const result = await SchoolService.updateSchool(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'School not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteSchool = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const result = await SchoolService.deleteSchool(req.params.id);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'School not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};
