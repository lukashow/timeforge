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
        name: `${prefix}(${i})`,
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

// POST /api/classes/clear-form-teachers - Clear all form teachers
router.post("/clear-form-teachers", async (_req: Request, res: Response) => {
  try {
    const classes = await pb.collection("classes").getFullList({ requestKey: null });
    
    // Process in batches
    const promises = classes.map(cls => 
      pb.collection("classes").update(cls.id, { formTeacher: null })
    );
    
    await Promise.all(promises);
    res.status(200).json({ message: "Cleared all form teachers" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear form teachers" });
  }
});

router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const classId = req.params.id;
    
    // First delete related timetable entries
    try {
      const timetableEntries = await pb.collection("timetable_entries").getFullList({
        filter: `class_id = "${classId}"`,
        requestKey: null
      });
      for (const entry of timetableEntries) {
        await pb.collection("timetable_entries").delete(entry.id, { requestKey: null });
      }
    } catch {
      // Collection might not exist, ignore
    }
    
    // Delete related assignments
    try {
      const assignments = await pb.collection("assignments").getFullList({
        filter: `class = "${classId}"`,
        requestKey: null
      });
      for (const assignment of assignments) {
        await pb.collection("assignments").delete(assignment.id, { requestKey: null });
      }
    } catch {
      // Ignore errors
    }
    
    // Now delete the class
    await pb.collection("classes").delete(classId);
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete class:", error);
    res.status(400).json({ error: "Failed to delete class" });
  }
});

export default router;
