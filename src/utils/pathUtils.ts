// src/utils/pathUtils.ts
/**
 * Path Utilities for Production-Safe File Access
 * Handles absolute path resolution for local and Render environments
 *
 * IMPORTANT: PDFs are at PROJECT ROOT /pdfs, not in dist/
 * On Render: /opt/render/project/src/pdfs/
 */

import path from 'path';
import fs from 'fs/promises';

/**
 * Get absolute path to PDF directory
 * ALWAYS resolves to /opt/render/project/src/pdfs/ on Render
 */
export function getPdfDirectory(): string {
  // process.cwd() returns the directory where node was started
  // On Render running "node dist/index.js", cwd is /opt/render/project/src/
  const baseDir = process.cwd();
  const pdfDir = path.join(baseDir, 'pdfs');

  console.log('[PathUtils] Base directory (cwd):', baseDir);
  console.log('[PathUtils] PDF directory resolved to:', pdfDir);

  return pdfDir;
}

/**
 * Normalize filename - strips any 'pdfs/' prefix if present
 * @param filename - Filename that might have 'pdfs/' prefix
 * @returns Just the filename without any path
 */
function normalizeFilename(filename: string): string {
  if (!filename) {
    return filename;
  }

  // Remove leading 'pdfs/' or 'pdfs\' if present
  let normalized = filename.replace(/^pdfs[\/\\]/, '');

  // Also handle '../pdfs/' or similar
  normalized = normalized.replace(/^\.\.?[\/\\]pdfs[\/\\]/, '');

  // Get just the basename (filename without any directory)
  normalized = path.basename(normalized);

  if (normalized !== filename) {
    console.log('[PathUtils] Normalized filename:', {
      original: filename,
      normalized,
    });
  }

  return normalized;
}

/**
 * Get absolute path to a specific PDF file
 * @param filename - Filename (may include 'pdfs/' prefix which will be stripped)
 * @returns Absolute path to the PDF file
 */
export function getPdfPath(filename: string): string {
  const normalizedFilename = normalizeFilename(filename);
  const pdfDir = getPdfDirectory();
  const absolutePath = path.join(pdfDir, normalizedFilename);

  console.log('[PathUtils] PDF path resolved:', {
    input: filename,
    normalizedFilename,
    absolutePath,
  });

  return absolutePath;
}

/**
 * Check if a PDF file exists
 * @param filename - Just the filename (any path prefix will be stripped)
 * @returns true if file exists, false otherwise
 */
export async function pdfExists(filename: string): Promise<boolean> {
  try {
    const absolutePath = getPdfPath(filename);
    await fs.access(absolutePath);
    console.log('[PathUtils] PDF exists:', filename, '✓');
    return true;
  } catch {
    console.log('[PathUtils] PDF does NOT exist:', filename, '✗');
    return false;
  }
}

/**
 * List all PDF files in the pdfs directory
 * @returns Array of PDF filenames (just names, not paths)
 */
export async function listPdfFiles(): Promise<string[]> {
  try {
    const pdfDir = getPdfDirectory();
    const files = await fs.readdir(pdfDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    console.log('[PathUtils] Found PDF files:', pdfFiles.length);
    pdfFiles.forEach(f => console.log('  - ', f));

    return pdfFiles;
  } catch (error: any) {
    console.error('[PathUtils] Error listing PDF files:', error.message);
    return [];
  }
}

/**
 * Initialize and log PDF directory status
 * Call this at server startup
 */
export async function initializePdfDirectory(): Promise<void> {
  console.log('\n========================================');
  console.log('PDF DIRECTORY INITIALIZATION');
  console.log('========================================');

  const pdfDir = getPdfDirectory();

  try {
    // Check if directory exists
    await fs.access(pdfDir);
    console.log('✓ PDF directory exists:', pdfDir);

    // List all PDFs
    const pdfFiles = await listPdfFiles();
    console.log('✓ Total PDFs found:', pdfFiles.length);

    if (pdfFiles.length === 0) {
      console.warn('⚠ WARNING: No PDF files found in', pdfDir);
    }
  } catch (error: any) {
    console.error('✗ ERROR: PDF directory not accessible:', pdfDir);
    console.error('  Error:', error.message);
  }

  console.log('========================================\n');
}
