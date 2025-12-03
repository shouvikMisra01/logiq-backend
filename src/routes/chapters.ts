// backend/src/routes/chapters.ts
import { Router, Request, Response } from "express";
import { collections } from "../config/database";

const router = Router();

/**
 * GET /api/chapters/classes
 * → Distinct list of class_ids that have uploaded PDFs
 */
router.get("/classes", async (_req: Request, res: Response) => {
  try {
    const classes = await collections.chapters().distinct("class_id");
    return res.json({ classes });
  } catch (err) {
    console.error("[chapters/classes] Error:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch classes from chapters" });
  }
});

/**
 * GET /api/chapters/subjects?class_id=class 10
 * → Distinct subjects for a given class
 */
router.get("/subjects", async (req: Request, res: Response) => {
  try {
    const class_id = req.query.class_id as string | undefined;

    if (!class_id) {
      return res.status(400).json({ error: "class_id query param is required" });
    }

    const subjects = await collections
      .chapters()
      .distinct("subject_id", { class_id });

    return res.json({ class_id, subjects });
  } catch (err) {
    console.error("[chapters/subjects] Error:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch subjects from chapters" });
  }
});

/**
 * GET /api/chapters?class_id=...&subject_id=...
 * → List of chapter records (can be whole-subject PDFs if chapter_name/code are null)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const class_id = req.query.class_id as string | undefined;
    const subject_id = req.query.subject_id as string | undefined;

    const filter: any = {};
    if (class_id) filter.class_id = class_id;
    if (subject_id) filter.subject_id = subject_id;

    const chapters = await collections
      .chapters()
      .find(filter)
      .project({
        _id: 0, // hide internal Mongo _id for cleaner API
        documentId: 1,
        class_id: 1,
        subject_id: 1,
        chapter_name: 1,
        chapter_code: 1,
        original_filename: 1,
        created_at: 1,
      })
      .sort({ created_at: -1 })
      .toArray();

    return res.json({ chapters });
  } catch (err) {
    console.error("[chapters/list] Error:", err);
    return res.status(500).json({ error: "Failed to fetch chapters" });
  }
});

export default router;
