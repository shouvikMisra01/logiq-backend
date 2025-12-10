// src/controllers/schoolAdminController.ts
/**
 * School Admin Controller
 */

import { Request, Response } from 'express';
import { SchoolAdminService } from '../services/schoolAdminService';

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = req.params;
    const data = await SchoolAdminService.getDashboardData(schoolId);
    res.json(data);
  } catch (error: any) {
    if (error.message === 'School not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message });
  }
};
