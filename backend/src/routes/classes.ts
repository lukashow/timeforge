import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";
import type { ClassRecord, ClassExpanded } from "@/types/pocketbase.d.ts";

const router = Router();

// GET /api/classes - List all classes (with expands)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const records = await pb.collection("classes").getFullList<ClassExpanded>({
      sort: "name",
      expand: "discipline,formTeacher",
      requestKey: null,
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// GET /api/classes/:id - Get single class
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const record = await pb.collection("classes").getOne<ClassExpanded>(req.params.id, {
      expand: "discipline,formTeacher",
    });
    res.json(record);
  } catch (error) {
    res.status(404).json({ error: "Class not found" });
  }
});

// POST /api/classes - Create class
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, category, discipline, formTeacher } = req.body;
    const record = await pb.collection("classes").create<ClassRecord>({
      name,
      category,
      discipline,
      formTeacher: formTeacher || null,
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to create class" });
  }
});

// POST /api/classes/bulk - Create multiple classes
router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const { prefix, startNum, endNum, category, discipline } = req.body;
    const classes: ClassRecord[] = [];
    
    for (let i = startNum; i <= endNum; i++) {
      const record = await pb.collection("classes").create<ClassRecord>({
        name: `${prefix}(${i})班`,
        category,
        discipline,
        formTeacher: null,
      });
      classes.push(record);
    }
    
    res.status(201).json(classes);
  } catch (error) {
    res.status(400).json({ error: "Failed to create classes" });
  }
});

// PUT /api/classes/:id - Update class
router.put("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, category, discipline, formTeacher } = req.body;
    const record = await pb.collection("classes").update<ClassRecord>(req.params.id, {
      name,
      category,
      discipline,
      formTeacher,
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to update class" });
  }
});

// PUT /api/classes/:id/form-teacher - Assign form teacher
router.put("/:id/form-teacher", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { formTeacher } = req.body;
    const record = await pb.collection("classes").update<ClassRecord>(req.params.id, {
      formTeacher,
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to assign form teacher" });
  }
});

// DELETE /api/classes/:id - Delete class
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await pb.collection("classes").delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: "Failed to delete class" });
  }
});

export default router;
