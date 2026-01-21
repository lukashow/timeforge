import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";
import type { TeacherRecord, TeacherExpanded } from "@/types/pocketbase.d.ts";

const router = Router();

// GET /api/teachers - List all teachers (with subject expanded)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const records = await pb.collection("teachers").getFullList<TeacherExpanded>({
      sort: "name",
      expand: "subject",
      requestKey: null,
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});

// GET /api/teachers/:id - Get single teacher
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const record = await pb.collection("teachers").getOne<TeacherExpanded>(req.params.id, {
      expand: "subject",
    });
    res.json(record);
  } catch (error) {
    res.status(404).json({ error: "Teacher not found" });
  }
});

// POST /api/teachers - Create teacher
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, subject, weeklyLoad, unavailable } = req.body;
    const record = await pb.collection("teachers").create<TeacherRecord>({
      name,
      subject,
      weeklyLoad: weeklyLoad || 25,
      unavailable: unavailable || [],
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to create teacher" });
  }
});

// PUT /api/teachers/:id - Update teacher
router.put("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, subject, weeklyLoad, unavailable } = req.body;
    const record = await pb.collection("teachers").update<TeacherRecord>(req.params.id, {
      name,
      subject,
      weeklyLoad,
      unavailable,
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to update teacher" });
  }
});

// PUT /api/teachers/:id/unavailable - Update only unavailable times
router.put("/:id/unavailable", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { unavailable } = req.body;
    const record = await pb.collection("teachers").update<TeacherRecord>(req.params.id, {
      unavailable,
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to update unavailable times" });
  }
});

// DELETE /api/teachers/:id - Delete teacher
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await pb.collection("teachers").delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: "Failed to delete teacher" });
  }
});

export default router;
