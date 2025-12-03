// src/middleware/auth.ts
/**
 * JWT Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
    role: 'super_admin' | 'school_admin' | 'student' | 'parent';
    schoolId?: string;
    classNumber?: number;
    classLabel?: string;
  };
  student?: {
    studentId: string;
    email: string;
    classNumber: number;
    classLabel: string;
    schoolId: string;
  };
}

export function authenticateStudent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = AuthService.verifyToken(token);

    // Store user data
    req.user = payload;

    // For backward compatibility, also populate req.student if role is student
    if (payload.role === 'student') {
      req.student = {
        studentId: payload.userId,
        email: payload.email,
        classNumber: payload.classNumber!,
        classLabel: payload.classLabel!,
        schoolId: payload.schoolId!,
      };
    }

    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
