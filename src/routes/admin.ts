// src/routes/admin.ts
import express from 'express';
// @ts-ignore
import { getSystemAnalytics } from '../controllers/analyticsController';
// @ts-ignore
import { getAllUsers } from '../controllers/userManagementController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Middleware to ensure only super_admin can access these routes
router.use(authenticateToken);
router.use(requireRole(['super_admin']));

router.get('/analytics', getSystemAnalytics);
router.get('/users', getAllUsers);

export default router;
