import express, { Router } from 'express';
import { login, getDemoProfile, forgotPassword, resetPassword, verifyInvite, completeInvite } from '../controllers/authController';

const router: Router = express.Router();

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/demo/:role
router.get('/demo/:role', getDemoProfile);

// Password Management
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Invite Management
router.post('/verify-invite', verifyInvite);
router.post('/complete-invite', completeInvite);

export default router;
