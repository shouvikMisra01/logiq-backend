// src/services/pdfService.ts
/**
 * PDF Processing Service - Production-Safe with Absolute Paths
 */

import fs from 'fs/promises';
import { getPdfPath, pdfExists as utilPdfExists } from '../utils/pathUtils';

// pdf-parse 1.x has a simple default export
const pdfParse = require('pdf-parse');

export class PDFService {
  /**
   * Get path to PDF file using ABSOLUTE path resolution
   * We are using the naming convention:
   *   {class_id}_{subject_id}_{chapter_code}.pdf
   * Example:
   *   "class 9_science_ch1-10.pdf"
   */
  static getPDFPath(classId: string, subject: string, chapter: string): string {
    const filename = `${classId}_${subject}_${chapter}.pdf`;
    return getPdfPath(filename);
  }

  /**
   * Extract text from PDF file (accepts absolute path)
   */
  static async extractTextFromPDF(pdfPath: string): Promise<string> {
    console.log('[PDFService] Extracting text from PDF:', pdfPath);

    try {
      // Validate path
      if (!pdfPath || pdfPath.trim() === '') {
        console.error('[PDFService] Empty PDF path provided');
        throw new Error('PDF path is empty');
      }

      // Read the PDF file
      let dataBuffer: Buffer;
      try {
        dataBuffer = await fs.readFile(pdfPath);
        console.log('[PDFService] PDF file read successfully, size:', dataBuffer.length, 'bytes');
      } catch (readError: any) {
        console.error('[PDFService] Failed to read PDF file:', {
          path: pdfPath,
          error: readError.message,
          code: readError.code,
        });

        if (readError.code === 'ENOENT') {
          throw new Error(`PDF file not found: ${pdfPath}`);
        }
        if (readError.code === 'EACCES') {
          throw new Error(`Permission denied reading PDF: ${pdfPath}`);
        }
        throw new Error(`Failed to read PDF file: ${readError.message}`);
      }

      // Validate buffer
      if (!dataBuffer || dataBuffer.length === 0) {
        console.error('[PDFService] PDF file is empty');
        throw new Error('PDF file is empty or unreadable');
      }

      // Use pdf-parse as a simple function
      let data: any;
      try {
        data = await pdfParse(dataBuffer);
        console.log('[PDFService] PDF parsed successfully, pages:', data.numpages);
      } catch (parseError: any) {
        console.error('[PDFService] Failed to parse PDF:', {
          error: parseError.message,
          path: pdfPath,
        });
        throw new Error(`Failed to parse PDF (file may be corrupted): ${parseError.message}`);
      }

      // Validate extracted text
      if (!data.text || data.text.trim().length === 0) {
        console.error('[PDFService] No text extracted from PDF');
        throw new Error('No text could be extracted from PDF (file may be scanned image)');
      }

      console.log('[PDFService] Text extracted successfully, length:', data.text.length);
      return data.text;
    } catch (error: any) {
      console.error('[PDFService] Error in extractTextFromPDF:', {
        error: error.message,
        stack: error.stack,
        path: pdfPath,
      });
      // Re-throw with context
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Check if PDF exists for given class, subject, chapter
   */
  static async pdfExists(classId: string, subject: string, chapter: string): Promise<boolean> {
    const filename = `${classId}_${subject}_${chapter}.pdf`;
    return await utilPdfExists(filename);
  }

  /**
   * Get PDF text for quiz generation
   * DEFENSIVE: Returns null instead of throwing if PDF not found
   */
  static async getPDFTextForQuiz(
    classId: string,
    subject: string,
    chapter: string
  ): Promise<string | null> {
    try {
      const pdfPath = this.getPDFPath(classId, subject, chapter);
      const exists = await this.pdfExists(classId, subject, chapter);

      if (!exists) {
        console.warn('[PDFService] PDF not found:', {
          classId,
          subject,
          chapter,
          expectedPath: pdfPath,
        });
        return null;
      }

      return await this.extractTextFromPDF(pdfPath);
    } catch (error: any) {
      console.error('[PDFService] Error getting PDF text for quiz:', {
        classId,
        subject,
        chapter,
        error: error.message,
      });
      return null;
    }
  }
}
