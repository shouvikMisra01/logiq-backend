// src/controllers/syllabusController.ts
/**
 * Syllabus Controller
 */

import { Request, Response } from 'express';
import { SyllabusService } from '../services/syllabusService';
import { AuthRequest } from '../middleware/auth';

/**
 * Trigger AI parsing for uploaded PDF
 * POST /api/syllabus/parse/:documentId
 */
export const parseSyllabus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;
    const { classHint, subjectHint } = req.body;

    const syllabus = await SyllabusService.uploadAndParseSyllabus(
      documentId,
      classHint,
      subjectHint
    );

    res.status(201).json({
      message: 'Syllabus parsed and stored successfully',
      syllabus: {
        classLabel: syllabus.classLabel,
        classNumber: syllabus.classNumber,
        subjectName: syllabus.subjectName,
        chapterCount: syllabus.chapters.length,
      },
    });
  } catch (error: any) {
    console.error('Error parsing syllabus:', error);
    res.status(500).json({ error: error.message || 'Failed to parse syllabus' });
  }
};

/**
 * Get subjects for logged-in student's class
 * GET /api/syllabus/subjects-for-student
 */
export const getSubjectsForStudent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('[Syllabus] Get subjects request from user:', req.user);

    // Allow both students and parents to access this endpoint
    // Students have req.student populated, parents have classNumber in req.user
    const classNumber = req.student?.classNumber || req.user?.classNumber;

    if (!classNumber) {
      console.log('[Syllabus] No class data in request');
      res.status(401).json({ error: 'Unauthorized - Student or Parent role required' });
      return;
    }

    console.log('[Syllabus] Fetching subjects for class:', classNumber);
    const subjects = await SyllabusService.getSubjectsForClass(classNumber);

    console.log('[Syllabus] Found', subjects.length, 'subjects');
    res.json({ subjects });
  } catch (error: any) {
    console.error('[Syllabus] Error getting subjects:', error);
    res.status(500).json({ error: error.message || 'Failed to get subjects' });
  }
};

/**
 * Get chapters for a syllabus
 * GET /api/syllabus/:syllabusId/chapters
 */
export const getChapters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { syllabusId } = req.params;

    const result = await SyllabusService.getChaptersForSyllabus(syllabusId);

    res.json(result);
  } catch (error: any) {
    console.error('Error getting chapters:', error);
    res.status(500).json({ error: error.message || 'Failed to get chapters' });
  }
};
