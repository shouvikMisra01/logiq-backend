import express from 'express';
import { ClassService } from '../services/classService';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Create a class
// POST /api/classes
router.post('/', requireRole(['school_admin', 'super_admin']), async (req, res) => {
    try {
        const { name, section } = req.body;
        // user.schoolId should be present for school_admin
        // For super_admin, they might pass school_id in body
        const schoolId = (req.user as any).schoolId || req.body.school_id;

        if (!schoolId) {
            return res.status(400).json({ error: 'School ID is required' });
        }

        const newClass = await ClassService.createClass(schoolId, name, section);
        res.status(201).json(newClass);
    } catch (error: any) {
        res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
    }
});

// List classes
// GET /api/classes?school_id=... (optional, defaults to user's school)
router.get('/', async (req, res) => {
    try {
        const schoolId = (req.user as any).schoolId || req.query.school_id;

        if (!schoolId) {
            return res.status(400).json({ error: 'School ID is required' });
        }

        const classes = await ClassService.getClasses(schoolId as string);
        res.json(classes);
    } catch (error: any) {
        res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Delete a class
// DELETE /api/classes/:id
router.delete('/:id', requireRole(['school_admin', 'super_admin']), async (req, res) => {
    try {
        const classId = req.params.id;
        const schoolId = (req.user as any).schoolId;

        // TODO: If super_admin, verify they can delete any class or specific school logic
        // For now assuming school_admin is deleting their own class

        // Safety check: ensure schoolId is present if user is school_admin
        if ((req.user as any).role === 'school_admin' && !schoolId) {
            return res.status(403).json({ error: 'No school associated with admin account' });
        }

        await ClassService.deleteClass(schoolId, classId);
        res.json({ success: true, message: 'Class deleted' });
    } catch (error: any) {
        res.status(error.status || 500).json({ error: error.message || 'Internal Server Error' });
    }
});

export default router;
