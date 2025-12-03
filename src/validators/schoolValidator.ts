// src/validators/schoolValidator.ts
/**
 * School Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';

interface ValidationError {
  field: string;
  message: string;
}

export const validateSchoolCreate = (req: Request, res: Response, next: NextFunction): void | Response => {
  const { school_code, name, contact_email, student_limit, subscription_tier } = req.body;
  const errors: ValidationError[] = [];

  // School code validation
  if (!school_code || school_code.trim().length === 0) {
    errors.push({ field: 'school_code', message: 'School code cannot be empty' });
  } else if (school_code.length < 3) {
    errors.push({ field: 'school_code', message: 'School code must be at least 3 characters long' });
  } else if (!/^[a-zA-Z0-9_-]+$/.test(school_code)) {
    errors.push({
      field: 'school_code',
      message: 'School code can only contain letters, numbers, hyphens, and underscores',
    });
  }

  // Name validation
  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'School name cannot be empty' });
  } else if (name.trim().length < 3) {
    errors.push({ field: 'name', message: 'School name must be at least 3 characters long' });
  }

  // Email validation
  if (!contact_email || contact_email.trim().length === 0) {
    errors.push({ field: 'contact_email', message: 'Contact email cannot be empty' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
    errors.push({
      field: 'contact_email',
      message: 'Please enter a valid email address (e.g., admin@school.com)',
    });
  }

  // Phone validation (optional)
  if (req.body.contact_phone && req.body.contact_phone.trim().length > 0) {
    const phone = req.body.contact_phone.replace(/[\s\-()]/g, '');
    const digits = phone.replace(/\+/g, '');

    if (!/^[\d+\s\-()]+$/.test(req.body.contact_phone)) {
      errors.push({
        field: 'contact_phone',
        message: 'Phone number can only contain digits, spaces, hyphens, parentheses, and + symbol',
      });
    } else if (digits.length < 10) {
      errors.push({
        field: 'contact_phone',
        message: 'Phone number must contain at least 10 digits',
      });
    } else if (digits.length > 15) {
      errors.push({
        field: 'contact_phone',
        message: 'Phone number cannot exceed 15 digits',
      });
    }
  }

  // Student limit validation
  if (student_limit !== undefined) {
    if (student_limit < 1) {
      errors.push({ field: 'student_limit', message: 'Student limit must be at least 1' });
    } else if (student_limit > 10000) {
      errors.push({ field: 'student_limit', message: 'Student limit cannot exceed 10,000' });
    }
  }

  // Subscription tier validation
  if (subscription_tier) {
    const validTiers = ['basic', 'professional', 'enterprise'];
    if (!validTiers.includes(subscription_tier.toLowerCase())) {
      errors.push({
        field: 'subscription_tier',
        message: 'Subscription tier must be one of: basic, professional, enterprise',
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

  // Auto-uppercase school code
  req.body.school_code = school_code.toUpperCase();

  next();
};

export const validateSchoolUpdate = (req: Request, res: Response, next: NextFunction): void | Response => {
  const errors: ValidationError[] = [];

  // Only validate provided fields
  if (req.body.name !== undefined && req.body.name.trim().length < 3) {
    errors.push({ field: 'name', message: 'School name must be at least 3 characters long' });
  }

  if (req.body.contact_email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.contact_email)) {
    errors.push({
      field: 'contact_email',
      message: 'Please enter a valid email address',
    });
  }

  if (req.body.student_limit !== undefined) {
    if (req.body.student_limit < 1 || req.body.student_limit > 10000) {
      errors.push({
        field: 'student_limit',
        message: 'Student limit must be between 1 and 10,000',
      });
    }
  }

  if (errors.length > 0) {
    return res.status(422).json({
      detail: 'Validation failed',
      errors,
      validation_errors: true,
    });
  }

  next();
};
