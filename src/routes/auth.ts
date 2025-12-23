import express, { Router } from 'express';
import {
    login,
    getDemoProfile,
    forgotPassword,
    resetPassword,
    verifyInvite,
    completeInvite,
    sendAuthLink,
    verifyAuthToken
} from '../controllers/authController';

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

// Unified Auth (Magic Links)
router.post('/send-link', sendAuthLink);
router.post('/verify-token', verifyAuthToken);

export default router;
