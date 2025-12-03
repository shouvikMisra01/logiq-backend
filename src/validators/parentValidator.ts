// src/validators/parentValidator.ts
/**
 * Parent Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';

interface ValidationError {
  field: string;
  message: string;
}

export const validateParentCreate = (req: Request, res: Response, next: NextFunction): void | Response => {
  const { name, email, password, school_id, child_student_id, child_name, child_class_label, child_class_number } = req.body;
  const errors: ValidationError[] = [];

  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Parent name cannot be empty' });
  } else if (name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Parent name must be at least 2 characters long' });
  }

  if (!email || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email cannot be empty' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({
      field: 'email',
      message: 'Please enter a valid email address',
    });
  }

  if (!password || password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
  }

  if (!school_id || school_id.trim().length === 0) {
    errors.push({ field: 'school_id', message: 'School ID is required' });
  }

  if (!child_student_id || child_student_id.trim().length === 0) {
    errors.push({ field: 'child_student_id', message: 'Child student ID is required' });
  }

  if (!child_name || child_name.trim().length === 0) {
    errors.push({ field: 'child_name', message: 'Child name is required' });
  }

  if (!child_class_label || child_class_label.trim().length === 0) {
    errors.push({ field: 'child_class_label', message: 'Child class label is required' });
  }

  if (!child_class_number || isNaN(child_class_number)) {
    errors.push({ field: 'child_class_number', message: 'Child class number must be a valid number' });
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

export const validateParentUpdate = (req: Request, res: Response, next: NextFunction): void | Response => {
  const { name, email } = req.body;
  const errors: ValidationError[] = [];

  if (name !== undefined) {
    if (name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Parent name cannot be empty' });
    } else if (name.trim().length < 2) {
      errors.push({ field: 'name', message: 'Parent name must be at least 2 characters long' });
    }
  }

  if (email !== undefined) {
    if (email.trim().length === 0) {
      errors.push({ field: 'email', message: 'Email cannot be empty' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({
        field: 'email',
        message: 'Please enter a valid email address',
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
