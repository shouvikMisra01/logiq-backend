import express, { Router } from 'express';
import { login, getDemoProfile } from '../controllers/authController';

const router: Router = express.Router();

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/demo/:role
router.get('/demo/:role', getDemoProfile);

export default router;
