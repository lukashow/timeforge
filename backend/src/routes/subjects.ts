import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";
import type { SubjectRecord } from "@/types/pocketbase.d.ts";

const router = Router();

// GET /api/subjects - List all subjects
router.get("/", async (_req: Request, res: Response) => {
  try {
    const records = await pb.collection("subjects").getFullList<SubjectRecord>({
      sort: "name",
      requestKey: null,
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// GET /api/subjects/:id - Get single subject
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const record = await pb.collection("subjects").getOne<SubjectRecord>(req.params.id);
    res.json(record);
  } catch (error) {
    res.status(404).json({ error: "Subject not found" });
  }
});

// POST /api/subjects - Create subject
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, shortName, color, requiresLab } = req.body;
    const record = await pb.collection("subjects").create<SubjectRecord>({
      name,
      shortName,
      color,
      requiresLab: requiresLab || false,
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to create subject" });
  }
});

// PUT /api/subjects/:id - Update subject
router.put("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, shortName, color, requiresLab } = req.body;
    const record = await pb.collection("subjects").update<SubjectRecord>(req.params.id, {
      name,
      shortName,
      color,
      requiresLab,
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to update subject" });
  }
});

// DELETE /api/subjects/:id - Delete subject
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await pb.collection("subjects").delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: "Failed to delete subject" });
  }
});

export default router;
