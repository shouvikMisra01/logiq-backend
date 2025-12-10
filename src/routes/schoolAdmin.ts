// src/routes/schoolAdmin.ts
/**
 * School Admin Routes
 */

import express, { Router } from 'express';
import { getDashboard } from '../controllers/schoolAdminController';

const router: Router = express.Router();

// GET /api/school-admin/:schoolId/dashboard - Get dashboard data
router.get('/:schoolId/dashboard', getDashboard);

export default router;
