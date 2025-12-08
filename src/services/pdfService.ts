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
    try {
      const dataBuffer = await fs.readFile(pdfPath);

      // Use pdf-parse as a simple function
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error: any) {
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
