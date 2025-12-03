// Mock data for demo purposes
import { Request, Response } from 'express';
import { mockData } from '../utils/mockData';

export const getSchools = (req: Request, res: Response): void => {
  try {
    res.json({ schools: mockData.schools });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getClasses = (req: Request, res: Response): void => {
  try {
    res.json({ classes: mockData.classes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSubjects = (req: Request, res: Response): void => {
  try {
    const { classId } = req.query;

    let subjects = mockData.subjects;
    if (classId) {
      subjects = subjects.filter(s => s.class_id === classId);
    }

    res.json({ subjects });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getStudents = (req: Request, res: Response): void => {
  try {
    res.json({ students: mockData.students });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
