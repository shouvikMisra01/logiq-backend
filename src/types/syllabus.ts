// src/types/syllabus.ts

export interface Topic {
  topicId: string;
  topicName: string;
}

export interface Chapter {
  chapterId: string;
  chapterName: string;
  topics: Topic[];
}

export interface SyllabusDocument {
  _id?: any;
  classLabel: string;
  classNumber: number;
  subjectName: string;
  chapters: Chapter[];
  sourcePdfId?: string;
  createdAt: Date;
  updatedAt: Date;
}
