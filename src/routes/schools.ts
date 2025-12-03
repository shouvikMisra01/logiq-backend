// src/routes/schools.ts
/**
 * School Routes
 */

import express, { Router } from 'express';
import {
  getStats,
  listSchools,
  createSchool,
  getSchool,
  updateSchool,
  deleteSchool,
} from '../controllers/schoolController';
import { validateSchoolCreate, validateSchoolUpdate } from '../validators/schoolValidator';

const router: Router = express.Router();

// GET /api/schools/stats - Platform statistics
router.get('/stats', getStats);

// GET /api/schools - List all schools
router.get('/', listSchools);

// POST /api/schools - Create new school
router.post('/', validateSchoolCreate, createSchool);

// GET /api/schools/:id - Get school by ID
router.get('/:id', getSchool);

// PUT /api/schools/:id - Update school
router.put('/:id', validateSchoolUpdate, updateSchool);

// DELETE /api/schools/:id - Delete school
router.delete('/:id', deleteSchool);

export default router;
