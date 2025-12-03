// src/routes/parents.ts
/**
 * Parent Routes
 */

import express, { Router } from 'express';
import {
  listParents,
  createParent,
  getParent,
  getParentByStudent,
  updateParent,
  deleteParent,
} from '../controllers/parentController';
import { validateParentCreate, validateParentUpdate } from '../validators/parentValidator';

const router: Router = express.Router();

// GET /api/parents - List parents
router.get('/', listParents);

// POST /api/parents - Create new parent
router.post('/', validateParentCreate, createParent);

// GET /api/parents/student/:studentId - Get parent by student ID
router.get('/student/:studentId', getParentByStudent);

// GET /api/parents/:id - Get parent by ID
router.get('/:id', getParent);

// PUT /api/parents/:id - Update parent
router.put('/:id', validateParentUpdate, updateParent);

// DELETE /api/parents/:id - Delete parent
router.delete('/:id', deleteParent);

export default router;
