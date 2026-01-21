import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";
import type { DisciplineRecord } from "@/types/pocketbase.d.ts";

const router = Router();

// GET /api/disciplines - List all disciplines
router.get("/", async (_req: Request, res: Response) => {
  try {
    const records = await pb.collection("disciplines").getFullList<DisciplineRecord>({
      sort: "name",
      requestKey: null,
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch disciplines" });
  }
});

// GET /api/disciplines/:id - Get single discipline
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const record = await pb.collection("disciplines").getOne<DisciplineRecord>(req.params.id);
    res.json(record);
  } catch (error) {
    res.status(404).json({ error: "Discipline not found" });
  }
});

// POST /api/disciplines - Create discipline
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, category, subjectAllocations, staticCourses } = req.body;
    const record = await pb.collection("disciplines").create<DisciplineRecord>({
      name,
      category,
      subjectAllocations: subjectAllocations || [],
      staticCourses: staticCourses || [],
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to create discipline" });
  }
});

// PUT /api/disciplines/:id - Update discipline
router.put("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, category, subjectAllocations, staticCourses } = req.body;
    const record = await pb.collection("disciplines").update<DisciplineRecord>(req.params.id, {
      name,
      category,
      subjectAllocations,
      staticCourses,
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to update discipline" });
  }
});

// PUT /api/disciplines/:id/allocations - Update only subject allocations
router.put("/:id/allocations", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { subjectAllocations } = req.body;
    const record = await pb.collection("disciplines").update<DisciplineRecord>(req.params.id, {
      subjectAllocations,
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to update allocations" });
  }
});

// PUT /api/disciplines/:id/static-courses - Update only static courses
router.put("/:id/static-courses", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { staticCourses } = req.body;
    const record = await pb.collection("disciplines").update<DisciplineRecord>(req.params.id, {
      staticCourses,
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to update static courses" });
  }
});

// DELETE /api/disciplines/:id - Delete discipline
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await pb.collection("disciplines").delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: "Failed to delete discipline" });
  }
});

export default router;
