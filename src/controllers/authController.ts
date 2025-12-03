// src/controllers/authController.ts
/**
 * Authentication Controller - Real JWT-based auth
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

export const login = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    console.log('[Auth] Login attempt - Request body:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('[Auth] Missing credentials - email:', !!email, 'password:', !!password);
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('[Auth] Authenticating user:', email);
    const result = await AuthService.login(email, password);

    console.log('[Auth] Login successful for:', email, 'Role:', result.user.role);
    res.json({
      token: result.token,
      user: result.user,
      message: 'Login successful',
    });
  } catch (error: any) {
    console.log('[Auth] Login failed:', error.message);
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
};

// Keep demo profile endpoint for backward compatibility
interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface DemoProfiles {
  [key: string]: Profile;
}

const demoProfiles: DemoProfiles = {
  super_admin: {
    id: 'demo-super-admin',
    email: 'admin@edubuddy.com',
    full_name: 'Super Admin',
    role: 'super_admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  school_admin: {
    id: 'demo-school-admin',
    email: 'admin@greenfield.edu',
    full_name: 'School Admin',
    role: 'school_admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  student: {
    id: 'demo-student',
    email: 'aditi.sharma@greenfield.edu',
    full_name: 'Aditi Sharma',
    role: 'student',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

export const getDemoProfile = (req: Request, res: Response): void | Response => {
  try {
    const { role } = req.params;

    if (!demoProfiles[role]) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({ profile: demoProfiles[role] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
