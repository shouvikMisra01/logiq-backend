import { v4 as uuidv4 } from 'uuid';
import { collections } from '../config/database';

export interface ClassDoc {
    class_id: string;
    school_id: string;
    name: string;      // e.g. "Class 10"
    section?: string;  // e.g. "A"
    created_at: Date;
}

export class ClassService {
    /**
     * Create a new class for a school
     */
    static async createClass(schoolId: string, name: string, section?: string) {
        if (!name) {
            throw { status: 400, message: 'Class name is required' };
        }

        const classesCol = collections.classes();

        // Check for duplicates
        const existing = await classesCol.findOne({
            school_id: schoolId,
            name: name,
            section: section || null // treat undefined as null for uniqueness check if desired, or allow multiple nulls? stricter to handle undefined
        });

        if (existing) {
            // If section is provided, check exact match. If separate, duplicate might mean same name+section.
            // If section is undefined, we might allow it if one with section exists? 
            // Let's assume (Name + Section) must be unique.
            throw { status: 409, message: 'Class already exists' };
        }

        const newClass: ClassDoc = {
            class_id: uuidv4(),
            school_id: schoolId,
            name: name,
            ...(section && { section }), // only add if defined
            created_at: new Date()
        };

        await classesCol.insertOne(newClass);
        return newClass;
    }

    /**
     * List all classes for a school
     */
    static async getClasses(schoolId: string) {
        const classesCol = collections.classes();
        // Sort by name, then section
        return await classesCol.find({ school_id: schoolId })
            .sort({ name: 1, section: 1 })
            .toArray();
    }

    /**
     * Delete a class
     */
    static async deleteClass(schoolId: string, classId: string) {
        const classesCol = collections.classes();
        // Verify ownership
        const result = await classesCol.deleteOne({ school_id: schoolId, class_id: classId });
        if (result.deletedCount === 0) {
            throw { status: 404, message: 'Class not found' };
        }
        return true;
    }
}
