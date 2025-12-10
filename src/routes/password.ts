// src/routes/password.ts
import express from 'express';
import { PasswordController } from '../controllers/passwordController';
import { authenticateStudent } from '../middleware/auth';

const router = express.Router();

// Change password (requires authentication)
router.post('/auth/change-password', authenticateStudent, PasswordController.changePassword);

export default router;
