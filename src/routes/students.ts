// src/routes/students.ts
/**
 * Student Routes
 */

import express, { Router } from 'express';
import {
  listStudents,
  createStudent,
  getStudent,
  updateStudent,
  deleteStudent,
  getDashboardStats,
} from '../controllers/studentController';
import { validateStudentCreate } from '../validators/studentValidator';

const router: Router = express.Router();

// GET /api/students - List students
router.get('/', listStudents);

// POST /api/students - Create new student
router.post('/', validateStudentCreate, createStudent);

// GET /api/students/:id/dashboard-stats - Get comprehensive dashboard stats
router.get('/:id/dashboard-stats', getDashboardStats);

// GET /api/students/:id - Get student by ID
router.get('/:id', getStudent);

// PUT /api/students/:id - Update student
router.put('/:id', updateStudent);

// DELETE /api/students/:id - Delete student
router.delete('/:id', deleteStudent);

export default router;
