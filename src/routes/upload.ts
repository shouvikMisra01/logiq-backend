// backend/src/routes/upload.ts
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

import { collections } from "../config/database";
import { ObjectId } from "mongodb";
import { SyllabusService } from "../services/syllabusService";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder to store PDFs (./pdfs at project root by default)
const PDF_FOLDER =
  process.env.PDF_FOLDER || path.join(__dirname, "../../pdfs");

// Ensure folder exists
if (!fs.existsSync(PDF_FOLDER)) {
  fs.mkdirSync(PDF_FOLDER, { recursive: true });
}

// Multer disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PDF_FOLDER);
  },
  filename: (req, file, cb) => {
    // Keep using ObjectId for tracking
    const documentId = new ObjectId().toHexString();
    (req as any).documentId = documentId;

    // Text fields from the form
    const body = req.body as any;

    const classId = body.class_id || 'unknown_class';
    const subjectId = body.subject_id || 'unknown_subject';
    const chapterCode = body.chapter_code || 'ch1';

    const ext = path.extname(file.originalname) || '.pdf';

    // 👉 IMPORTANT: this matches what pdfService expects
    const fileName = `${classId}_${subjectId}_${chapterCode}${ext}`;

    cb(null, fileName);
  },
});


const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// POST /api/upload/syllabus
router.post(
  "/syllabus",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { class_id, subject_id, chapter_name, chapter_code, school_id } =
        req.body;

      const file = req.file;
      const documentId = (req as any).documentId as string;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!class_id || !subject_id) {
        return res.status(400).json({
          error: "class_id and subject_id are required",
        });
      }

      // ✅ Insert metadata into MongoDB "chapters" collection
      await collections.chapters().insertOne({
        documentId,                         // UUID used to link file + DB
        school_id: school_id || null,      // later you can use real school id
        class_id,                          // free-text label from superadmin
        subject_id,                        // free-text label
        chapter_name: chapter_name || null,
        chapter_code: chapter_code || null,
        original_filename: file.originalname,
        stored_filename: file.filename,
        file_size: file.size,
        mime_type: file.mimetype,
        created_at: new Date(),
      });

      console.log('[upload/syllabus] PDF uploaded to chapters collection. Starting AI parsing...');

      // 🆕 Automatically parse with AI and store in syllabi collection
      try {
        const syllabusDoc = await SyllabusService.uploadAndParseSyllabus(
          documentId,
          class_id,
          subject_id
        );

        console.log('[upload/syllabus] AI parsing successful:', {
          subject: syllabusDoc.subjectName,
          class: syllabusDoc.classLabel,
          chapters: syllabusDoc.chapters.length,
        });

        // ✅ Response to frontend with both upload and parsing success
        return res.status(201).json({
          message: "Document uploaded and parsed successfully",
          documentId,
          fileName: file.filename,
          originalName: file.originalname,
          syllabus: {
            classLabel: syllabusDoc.classLabel,
            classNumber: syllabusDoc.classNumber,
            subjectName: syllabusDoc.subjectName,
            chapterCount: syllabusDoc.chapters.length,
          },
        });
      } catch (parseError: any) {
        console.error('[upload/syllabus] AI parsing failed:', parseError.message);

        // Still return success for upload, but indicate parsing failed
        return res.status(201).json({
          message: "Document uploaded but AI parsing failed",
          documentId,
          fileName: file.filename,
          originalName: file.originalname,
          parseError: parseError.message,
          note: "PDF was saved. You can manually trigger parsing later via /api/syllabus/parse/:documentId"
        });
      }
    } catch (err) {
      console.error("[upload/syllabus] Error:", err);
      return res
        .status(500)
        .json({ error: "Failed to upload syllabus document" });
    }
  }
);

export default router;
