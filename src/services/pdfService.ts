// src/services/pdfService.ts
/**
 * PDF Processing Service
 */

import fs from 'fs/promises';
import path from 'path';

// pdf-parse 1.x has a simple default export
const pdfParse = require('pdf-parse');

export class PDFService {
  private static PDF_FOLDER = process.env.PDF_FOLDER || 'pdfs';

  /**
   * Get path to PDF file
   * We are using the naming convention:
   *   {class_id}_{subject_id}_{chapter_code}.pdf
   * Example:
   *   "class 9_science_ch1-10.pdf"
   */
  static getPDFPath(classId: string, subject: string, chapter: string): string {
    const filename = `${classId}_${subject}_${chapter}.pdf`;
    return path.join(this.PDF_FOLDER, filename);
  }

  /**
   * Extract text from PDF file
   */
  static async extractTextFromPDF(pdfPath: string): Promise<string> {
    console.log('[PDFService] extractTextFromPDF called:', { pdfPath });

    // Path validation
    if (!pdfPath || typeof pdfPath !== 'string') {
      const errMsg = 'PDF path must be a non-empty string';
      console.error('[PDFService]', errMsg);
      throw new Error(errMsg);
    }

    if (pdfPath.trim().length === 0) {
      const errMsg = 'PDF path cannot be empty or whitespace';
      console.error('[PDFService]', errMsg);
      throw new Error(errMsg);
    }

    console.log('[PDFService] Reading PDF file from:', pdfPath);

    try {
      // File read error handling
      let dataBuffer;
      try {
        dataBuffer = await fs.readFile(pdfPath);
      } catch (readError: any) {
        console.error('[PDFService] File read error:', {
          code: readError.code,
          message: readError.message,
          path: readError.path,
        });

        if (readError.code === 'ENOENT') {
          throw new Error(`PDF file not found: ${pdfPath}`);
        } else if (readError.code === 'EACCES') {
          throw new Error(`Permission denied reading PDF file: ${pdfPath}`);
        } else if (readError.code === 'EISDIR') {
          throw new Error(`Path is a directory, not a file: ${pdfPath}`);
        }
        throw new Error(`Failed to read PDF file: ${readError.message}`);
      }

      // Buffer validation
      if (!dataBuffer) {
        const errMsg = 'PDF file read resulted in empty buffer';
        console.error('[PDFService]', errMsg);
        throw new Error(errMsg);
      }

      if (dataBuffer.length === 0) {
        const errMsg = 'PDF file is empty (0 bytes)';
        console.error('[PDFService]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[PDFService] Read PDF file, buffer size:', dataBuffer.length, 'bytes');

      // PDF parsing error handling
      let data;
      try {
        console.log('[PDFService] Parsing PDF content');
        data = await pdfParse(dataBuffer);
      } catch (parseError: any) {
        console.error('[PDFService] PDF parsing error:', {
          message: parseError.message,
          code: parseError.code,
        });
        throw new Error(`Failed to parse PDF: ${parseError.message}`);
      }

      // Text extraction validation
      if (!data) {
        const errMsg = 'PDF parsing returned no data';
        console.error('[PDFService]', errMsg);
        throw new Error(errMsg);
      }

      if (!data.text) {
        const errMsg = 'PDF parsing returned no text content';
        console.error('[PDFService]', errMsg);
        throw new Error(errMsg);
      }

      const extractedText = data.text.trim();
      if (extractedText.length === 0) {
        const errMsg = 'PDF text extraction resulted in empty content';
        console.error('[PDFService]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[PDFService] Successfully extracted', extractedText.length, 'characters from PDF');
      return extractedText;
    } catch (error: any) {
      console.error('[PDFService] Fatal error in extractTextFromPDF:', error.message);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Check if PDF exists for given class, subject, chapter
   */
  static async pdfExists(classId: string, subject: string, chapter: string): Promise<boolean> {
    const pdfPath = this.getPDFPath(classId, subject, chapter);
    try {
      await fs.access(pdfPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get PDF text for quiz generation
   */
  static async getPDFTextForQuiz(
    classId: string,
    subject: string,
    chapter: string
  ): Promise<string> {
    const pdfPath = this.getPDFPath(classId, subject, chapter);

    const exists = await this.pdfExists(classId, subject, chapter);
    if (!exists) {
      throw new Error(
        `PDF not found: ${pdfPath}. Please ensure the PDF exists in the format: {classId}_{subject}_{chapter}.pdf`
      );
    }

    return await this.extractTextFromPDF(pdfPath);
  }
}
