import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";
import type { AssignmentRecord, AssignmentExpanded } from "@/types/pocketbase.d.ts";

const router = Router();

// GET /api/assignments - List all assignments (with expands)
router.get("/", async (_req: Request, res: Response) => {
  try {
    // Use requestKey: null to disable auto-cancellation which can cause random aborts
    const records = await pb.collection("assignments").getFullList<AssignmentExpanded>({
      expand: "class,subject,teacher",
      requestKey: null, // Prevents PocketBase from aborting duplicate requests
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assignments", details: error });
  }
});

// GET /api/assignments/by-class/:classId - Get assignments for a class
router.get("/by-class/:classId", async (req: Request<{ classId: string }>, res: Response) => {
  try {
    const records = await pb.collection("assignments").getFullList<AssignmentExpanded>({
      filter: `class="${req.params.classId}"`,
      expand: "subject,teacher",
      requestKey: null,
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// POST /api/assignments/bulk - Create multiple assignments at once
router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const { assignments: items } = req.body;
    const results: AssignmentRecord[] = [];
    
    for (const item of items) {
      const record = await pb.collection("assignments").create<AssignmentRecord>({
        class: item.class,
        subject: item.subject,
        teacher: item.teacher || null,
      });
      results.push(record);
    }
    
    res.status(201).json(results);
  } catch (error) {
    res.status(400).json({ error: "Failed to create assignments" });
  }
});

// POST /api/assignments - Create assignment
router.post("/", async (req: Request, res: Response) => {
  try {
    const { class: classId, subject, teacher } = req.body;
    const record = await pb.collection("assignments").create<AssignmentRecord>({
      class: classId,
      subject,
      teacher: teacher || null,
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to create assignment" });
  }
});

// PUT /api/assignments/:id - Update assignment
router.put("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { teacher } = req.body;
    const record = await pb.collection("assignments").update<AssignmentRecord>(req.params.id, {
      teacher,
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to update assignment" });
  }
});

// PUT /api/assignments/batch - Batch update assignments
router.put("/batch", async (req: Request, res: Response) => {
  try {
    const { assignments } = req.body; // Array of { classId, subject, teacherId }
    const results: AssignmentRecord[] = [];
    
    for (const assignment of assignments) {
      // Find existing assignment
      const existing = await pb.collection("assignments").getFirstListItem<AssignmentRecord>(
        `class="${assignment.classId}" && subject="${assignment.subject}"`
      ).catch(() => null);
      
      if (existing) {
        // Update existing
        const updated = await pb.collection("assignments").update<AssignmentRecord>(existing.id, {
          teacher: assignment.teacherId,
        });
        results.push(updated);
      } else {
        // Create new
        const created = await pb.collection("assignments").create<AssignmentRecord>({
          class: assignment.classId,
          subject: assignment.subject,
          teacher: assignment.teacherId,
        });
        results.push(created);
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: "Failed to batch update assignments" });
  }
});

// DELETE /api/assignments/:id - Delete assignment
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await pb.collection("assignments").delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: "Failed to delete assignment" });
  }
});

// POST /api/assignments/auto-assign - Auto-assign teachers to all missing assignments
router.post("/auto-assign", async (_req: Request, res: Response) => {
  try {
    // Get all data
    const [classes, teachers, subjects, existingAssignments] = await Promise.all([
      pb.collection("classes").getFullList({ requestKey: null }),
      pb.collection("teachers").getFullList({ expand: "subject", requestKey: null }),
      pb.collection("subjects").getFullList({ requestKey: null }),
      pb.collection("assignments").getFullList({ requestKey: null }),
    ]);
    
    // Build teacher-by-subject map
    const teachersBySubject = new Map<string, string[]>();
    for (const teacher of teachers) {
      const subjectId = (teacher as { subject?: string }).subject;
      if (subjectId) {
        if (!teachersBySubject.has(subjectId)) {
          teachersBySubject.set(subjectId, []);
        }
        teachersBySubject.get(subjectId)!.push(teacher.id);
      }
    }
    
    // Build existing assignments set for quick lookup
    const existingSet = new Set(
      existingAssignments.map(a => `${(a as { class?: string }).class}-${(a as { subject?: string }).subject}`)
    );
    
    // Track assignment counts per teacher (including existing + new)
    const teacherAssignmentCount = new Map<string, number>();
    for (const teacher of teachers) {
      teacherAssignmentCount.set(teacher.id, 0);
    }
    // Count existing assignments
    for (const assignment of existingAssignments) {
      const teacherId = (assignment as { teacher?: string }).teacher;
      if (teacherId) {
        teacherAssignmentCount.set(teacherId, (teacherAssignmentCount.get(teacherId) || 0) + 1);
      }
    }
    
    // Generate assignments for all missing class-subject combinations
    // Use load-balanced selection: always pick teacher with lowest assignment count
    const toCreate: { class: string; subject: string; teacher: string }[] = [];
    
    for (const cls of classes) {
      for (const subject of subjects) {
        const key = `${cls.id}-${subject.id}`;
        if (!existingSet.has(key)) {
          // Find teacher with lowest assignment count for this subject
          const subjectTeachers = teachersBySubject.get(subject.id);
          if (subjectTeachers && subjectTeachers.length > 0) {
            // Sort by current assignment count and pick the one with lowest
            let minCount = Infinity;
            let selectedTeacher: string | null = null;
            
            for (const teacherId of subjectTeachers) {
              const count = teacherAssignmentCount.get(teacherId) || 0;
              if (count < minCount) {
                minCount = count;
                selectedTeacher = teacherId;
              }
            }
            
            if (selectedTeacher) {
              toCreate.push({
                class: cls.id,
                subject: subject.id,
                teacher: selectedTeacher,
              });
              // Update the count for this teacher (so next iteration considers it)
              teacherAssignmentCount.set(selectedTeacher, minCount + 1);
            }
          }
        }
      }
    }
    
    // Create all assignments in parallel (batched) - use requestKey: null to prevent auto-cancellation
    const created: AssignmentRecord[] = [];
    const batchSize = 20;
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((item, idx) => 
          pb.collection("assignments").create<AssignmentRecord>(item, { requestKey: `assign-${i}-${idx}` })
        )
      );
      created.push(...results);
    }
    
    // Fetch all assignments with expands to return
    const allAssignments = await pb.collection("assignments").getFullList<AssignmentExpanded>({
      expand: "class,subject,teacher",
      requestKey: null,
    });
    
    res.json({
      created: created.length,
      total: allAssignments.length,
      assignments: allAssignments,
    });
  } catch (error: unknown) {
    // Log detailed error for debugging with stack trace
    console.error("Auto-assign error:", error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
    
    // Extract detailed error info
    let errorDetails = 'Unknown error';
    if (error instanceof Error) {
      errorDetails = error.message + (error.stack ? '\n' + error.stack : '');
    } else if (error && typeof error === 'object') {
      const pbErr = error as { message?: string; data?: Record<string, unknown>; response?: { data?: Record<string, unknown> } };
      if (pbErr.response?.data) {
        errorDetails = JSON.stringify(pbErr.response.data);
      } else if (pbErr.data) {
        errorDetails = JSON.stringify(pbErr.data);
      } else if (pbErr.message) {
        errorDetails = pbErr.message;
      } else {
        try {
          errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch {
          errorDetails = String(error);
        }
      }
    }
    console.error("Error details:", errorDetails);
    
    res.status(400).json({ error: "Failed to auto-assign teachers", details: errorDetails });
  }
});

export default router;
