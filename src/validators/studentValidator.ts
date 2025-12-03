// src/validators/studentValidator.ts
/**
 * Student Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';

interface ValidationError {
  field: string;
  message: string;
}

export const validateStudentCreate = (req: Request, res: Response, next: NextFunction): void | Response => {
  const { school_id, name, email, class_id, password, parent_name, parent_email } = req.body;
  const errors: ValidationError[] = [];

  if (!school_id || school_id.trim().length === 0) {
    errors.push({ field: 'school_id', message: 'School ID is required' });
  }

  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Student name cannot be empty' });
  } else if (name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Student name must be at least 2 characters long' });
  }

  if (!email || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email cannot be empty' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({
      field: 'email',
      message: 'Please enter a valid email address',
    });
  }

  if (!class_id || class_id.trim().length === 0) {
    errors.push({ field: 'class_id', message: 'Class ID is required' });
  }

  if (!password || password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
  }

  // Optional parent fields validation
  // If either parent_name or parent_email is provided, both must be provided
  const hasParentName = parent_name && parent_name.trim().length > 0;
  const hasParentEmail = parent_email && parent_email.trim().length > 0;

  if (hasParentName || hasParentEmail) {
    if (!hasParentName) {
      errors.push({ field: 'parent_name', message: 'Parent name is required when parent email is provided' });
    } else if (parent_name.trim().length < 2) {
      errors.push({ field: 'parent_name', message: 'Parent name must be at least 2 characters long' });
    }

    if (!hasParentEmail) {
      errors.push({ field: 'parent_email', message: 'Parent email is required when parent name is provided' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent_email)) {
      errors.push({
        field: 'parent_email',
        message: 'Please enter a valid parent email address',
      });
    }
  }

  if (errors.length > 0) {
    const errorMsg = errors.length === 1 ? errors[0].message : 'Please fix the errors in the form';
    return res.status(422).json({
      detail: errorMsg,
      errors,
      validation_errors: true,
    });
  }

  next();
};
