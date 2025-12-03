// src/services/syllabusService.ts
/**
 * Syllabus Service - AI-powered syllabus parsing and management
 */

import { collections } from '../config/database';
import { PDFService } from './pdfService';
import { OpenAIService } from './openaiService';
import { SyllabusDocument } from '../types/syllabus';

export class SyllabusService {
  /**
   * Upload PDF and parse with AI
   */
  static async uploadAndParseSyllabus(
    pdfDocumentId: string,
    classHint?: string,
    subjectHint?: string
  ): Promise<SyllabusDocument> {
    console.log('[SyllabusService] Parsing syllabus for document:', pdfDocumentId);

    // 1. Get PDF metadata from chapters collection
    const pdfDoc = await collections.chapters().findOne({ documentId: pdfDocumentId });
    if (!pdfDoc) {
      throw new Error('PDF document not found');
    }

    console.log('[SyllabusService] PDF metadata:', {
      class_id: pdfDoc.class_id,
      subject_id: pdfDoc.subject_id,
      filename: pdfDoc.stored_filename,
    });

    // 2. Extract text from PDF
    const pdfPath = `pdfs/${pdfDoc.stored_filename}`;
    const pdfText = await PDFService.extractTextFromPDF(pdfPath);

    console.log('[SyllabusService] Extracted', pdfText.length, 'characters of text');

    // 3. Parse with AI
    console.log('[SyllabusService] Calling AI to parse with hints:', {
      classHint: classHint || pdfDoc.class_id,
      subjectHint: subjectHint || pdfDoc.subject_id,
    });

    const parsed = await OpenAIService.parseSyllabusFromText(
      pdfText,
      classHint || pdfDoc.class_id,
      subjectHint || pdfDoc.subject_id
    );

    console.log('[SyllabusService] AI parsed result:', {
      classLabel: parsed.classLabel,
      classNumber: parsed.classNumber,
      subjectName: parsed.subjectName,
      chapterCount: parsed.chapters.length,
    });

    // 4. Check if syllabus already exists for this class+subject
    const syllabusCol = collections.syllabi();
    const existing = await syllabusCol.findOne({
      classNumber: parsed.classNumber,
      subjectName: parsed.subjectName.toLowerCase(),
    });

    const syllabusDoc: Partial<SyllabusDocument> = {
      classLabel: parsed.classLabel,
      classNumber: parsed.classNumber,
      subjectName: parsed.subjectName.toLowerCase(),
      chapters: parsed.chapters,
      sourcePdfId: pdfDocumentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing
      await syllabusCol.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...syllabusDoc,
            updatedAt: new Date(),
          },
        }
      );
      return { ...syllabusDoc, _id: existing._id } as SyllabusDocument;
    } else {
      // Insert new
      const result = await syllabusCol.insertOne(syllabusDoc);
      return { ...syllabusDoc, _id: result.insertedId } as SyllabusDocument;
    }
  }

  /**
   * Get subjects for a student's class
   */
  static async getSubjectsForClass(classNumber: number): Promise<
    Array<{
      syllabusId: string;
      subjectName: string;
      classLabel: string;
      chapterCount: number;
      topicCount: number;
    }>
  > {
    console.log('[SyllabusService] Querying syllabi for classNumber:', classNumber);

    const syllabusCol = collections.syllabi();
    const syllabi = await syllabusCol.find({ classNumber }).toArray();

    console.log('[SyllabusService] Found', syllabi.length, 'syllabi');
    if (syllabi.length > 0) {
      console.log('[SyllabusService] First syllabus:', {
        classNumber: syllabi[0].classNumber,
        classLabel: syllabi[0].classLabel,
        subject: syllabi[0].subjectName,
      });
    }

    return syllabi.map((s: any) => {
      const topicCount = s.chapters.reduce(
        (sum: number, ch: any) => sum + (ch.topics?.length || 0),
        0
      );

      return {
        syllabusId: s._id.toString(),
        subjectName: s.subjectName,
        classLabel: s.classLabel,
        chapterCount: s.chapters.length,
        topicCount,
      };
    });
  }

  /**
   * Get chapters and topics for a syllabus
   */
  static async getChaptersForSyllabus(syllabusId: string): Promise<{
    syllabusId: string;
    subjectName: string;
    classLabel: string;
    chapters: Array<{
      chapterId: string;
      chapterName: string;
      topics: Array<{ topicId: string; topicName: string }>;
    }>;
  }> {
    const syllabusCol = collections.syllabi();
    const { ObjectId } = await import('mongodb');
    const syllabus = await syllabusCol.findOne({ _id: new ObjectId(syllabusId) });

    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    return {
      syllabusId: syllabus._id.toString(),
      subjectName: syllabus.subjectName,
      classLabel: syllabus.classLabel,
      chapters: syllabus.chapters,
    };
  }

  /**
   * Get chapter text for quiz generation
   */
  static async getChapterText(
    classNumber: number,
    subjectName: string,
    chapterId?: string
  ): Promise<string> {
    const syllabusCol = collections.syllabi();
    const syllabus = await syllabusCol.findOne({
      classNumber,
      subjectName: subjectName.toLowerCase(),
    });

    if (!syllabus) {
      throw new Error(`No syllabus found for Class ${classNumber} - ${subjectName}`);
    }

    // Get the source PDF and extract text
    if (!syllabus.sourcePdfId) {
      throw new Error('No source PDF linked to this syllabus');
    }

    const pdfDoc = await collections.chapters().findOne({
      documentId: syllabus.sourcePdfId,
    });

    if (!pdfDoc) {
      throw new Error('Source PDF not found');
    }

    const pdfPath = `pdfs/${pdfDoc.stored_filename}`;
    const fullText = await PDFService.extractTextFromPDF(pdfPath);

    // If specific chapter requested, try to extract that section
    // For now, return full text (you can improve this with better segmentation)
    return fullText;
  }
}
