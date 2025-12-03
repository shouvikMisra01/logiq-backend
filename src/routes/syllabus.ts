// src/routes/syllabus.ts

import express, { Router } from 'express';
import {
  parseSyllabus,
  getSubjectsForStudent,
  getChapters,
} from '../controllers/syllabusController';
import { authenticateStudent } from '../middleware/auth';

const router: Router = express.Router();

// Parse uploaded PDF with AI
router.post('/parse/:documentId', parseSyllabus);

// Get subjects for student (protected)
router.get('/subjects-for-student', authenticateStudent, getSubjectsForStudent);

// Get chapters for a syllabus
router.get('/:syllabusId/chapters', getChapters);

export default router;
