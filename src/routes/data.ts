import express, { Router } from 'express';
import { getSchools, getClasses, getSubjects, getStudents } from '../controllers/dataController';

const router: Router = express.Router();

// GET /api/data/schools
router.get('/schools', getSchools);

// GET /api/data/classes
router.get('/classes', getClasses);

// GET /api/data/subjects
router.get('/subjects', getSubjects);

// GET /api/data/students
router.get('/students', getStudents);

export default router;
