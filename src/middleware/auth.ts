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
    role: 'super_admin' | 'school_admin' | 'student' | 'parent' | 'teacher';
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

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  try {
    const authHeader = req.headers.authorization;

    console.log('[Auth Middleware] Auth header value:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Auth Middleware] Invalid auth header format');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    console.log('[Auth Middleware] Token extracted, length:', token.length);
    console.log('[Auth Middleware] Verifying token...');
    const payload = AuthService.verifyToken(token);
    console.log('[Auth Middleware] Token verified successfully for user:', payload.email);

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
    console.error('[Auth Middleware] Token verification failed:', error.message);
    console.error('[Auth Middleware] Error stack:', error.stack);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
}

// Alias for backward compatibility if needed elsewhere
export const authenticateStudent = authenticateToken;
