// src/utils/pathUtils.ts
/**
 * Path Utilities for Production-Safe File Access
 * Handles absolute path resolution for local and Render environments
 */

import path from 'path';
import fs from 'fs/promises';

/**
 * Get absolute path to PDF directory
 * Works in both development and production (Render)
 */
export function getPdfDirectory(): string {
  // Use process.cwd() as the base - this works in both local and Render
  const baseDir = process.cwd();
  const pdfDir = path.join(baseDir, 'pdfs');

  console.log('[PathUtils] PDF directory resolved to:', pdfDir);
  return pdfDir;
}

/**
 * Get absolute path to a specific PDF file
 * @param filename - Just the filename (e.g., "class 9_science_ch1.pdf")
 * @returns Absolute path to the PDF file
 */
export function getPdfPath(filename: string): string {
  const pdfDir = getPdfDirectory();
  const absolutePath = path.join(pdfDir, filename);

  console.log('[PathUtils] PDF path resolved:', {
    filename,
    absolutePath,
  });

  return absolutePath;
}

/**
 * Check if a PDF file exists
 * @param filename - Just the filename
 * @returns true if file exists, false otherwise
 */
export async function pdfExists(filename: string): Promise<boolean> {
  try {
    const absolutePath = getPdfPath(filename);
    await fs.access(absolutePath);
    console.log('[PathUtils] PDF exists:', filename);
    return true;
  } catch {
    console.log('[PathUtils] PDF does not exist:', filename);
    return false;
  }
}

/**
 * List all PDF files in the pdfs directory
 * @returns Array of PDF filenames
 */
export async function listPdfFiles(): Promise<string[]> {
  try {
    const pdfDir = getPdfDirectory();
    const files = await fs.readdir(pdfDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    console.log('[PathUtils] Found PDF files:', pdfFiles.length);
    return pdfFiles;
  } catch (error: any) {
    console.error('[PathUtils] Error listing PDF files:', error.message);
    return [];
  }
}
