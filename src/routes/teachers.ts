import { Router } from 'express';
import { TeacherController } from '../controllers/teacherController';

const router = Router();

// Teacher CRUD
router.get('/schools/:schoolId/teachers', TeacherController.listTeachers);
router.post('/schools/:schoolId/teachers', TeacherController.createTeacher);
router.put('/teachers/:teacherId', TeacherController.updateTeacher);
router.delete('/teachers/:teacherId', TeacherController.deleteTeacher);

// Assignments
router.get('/teachers/:teacherId/assignments', TeacherController.listAssignments);
router.post('/teachers/:teacherId/assignments', TeacherController.createAssignment);
router.put('/teachers/:teacherId/assignments/:assignmentId', TeacherController.updateAssignment);
router.delete('/teachers/:teacherId/assignments/:assignmentId', TeacherController.deleteAssignment);

// Get assigned students' performance
router.get('/teachers/:teacherId/students/performance', TeacherController.getAssignedStudentsPerformance);

// Utility endpoints
router.get('/schools/:schoolId/teacher-utils/classes', TeacherController.getClassesForSchool);
router.get('/schools/:schoolId/teacher-utils/subjects', TeacherController.getSubjectsForClass);
router.get('/schools/:schoolId/teacher-utils/students', TeacherController.getStudentsForFilter);

export default router;
