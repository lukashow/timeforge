import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";

const router = Router();

// Subject colors for consistency
const SUBJECT_COLORS = [
  '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B',
  '#EF4444', '#14B8A6', '#FCD34D', '#6366F1', '#84CC16',
  '#F97316', '#22D3EE', '#A855F7', '#3B82F6', '#E11D48'
];

// GET /api/timetable/latest - Get latest generated timetable with all related data
router.get("/latest", async (_req: Request, res: Response) => {
  try {
    // Fetch base data including time_grid for period count
    const [classesData, subjectsData, teachersData, timeGridData] = await Promise.all([
      pb.collection("classes").getFullList({ requestKey: null }),
      pb.collection("subjects").getFullList({ requestKey: null }),
      pb.collection("teachers").getFullList({ requestKey: null }),
      pb.collection("time_grid").getFullList({ requestKey: null }),
    ]);

    // Get max periods from time_grid config
    let maxPeriods = 0;
    if (timeGridData.length > 0) {
      const gridConfig = timeGridData[0] as { periodsPerDay?: number; periods?: unknown[] };
      if (gridConfig.periodsPerDay) {
        maxPeriods = gridConfig.periodsPerDay;
      } else if (Array.isArray(gridConfig.periods)) {
        maxPeriods = gridConfig.periods.length;
      }
    }

    // Format subjects with colors
    const subjects = subjectsData.map((s, i) => ({
      id: s.id,
      name: s.name as string,
      color: (s.color as string) || SUBJECT_COLORS[i % SUBJECT_COLORS.length]
    }));

    // Format classes
    const classes = classesData.map(c => ({
      id: c.id,
      name: c.name as string
    }));

    // Format teachers
    const teachers = teachersData.map(t => ({
      id: t.id,
      name: t.name as string
    }));

    // Check if timetable_entries collection exists and has data
    let entries: unknown[] = [];
    let generationId: string | null = null;

    try {
      // Get latest generation
      const latestEntry = await pb.collection("timetable_entries").getList(1, 1, {
        sort: "-created",
        requestKey: null
      });

      if (latestEntry.items.length > 0) {
        generationId = latestEntry.items[0].generation_id as string;
        
        // Fetch all entries for this generation
        const allEntries = await pb.collection("timetable_entries").getFullList({
          filter: `generation_id = "${generationId}"`,
          expand: "class_id,subject_id,teacher_id",
          requestKey: null
        });

        entries = allEntries.map(e => ({
          id: e.id,
          generation_id: e.generation_id,
          class_id: e.class_id,
          subject_id: e.subject_id,
          teacher_id: e.teacher_id,
          day: e.day,
          period: e.period,
          is_free: e.is_free,
          static_name: e.static_name,  // Include static course name!
          expand: e.expand
        }));

        // If maxPeriods wasn't set from time_grid, get it from entries
        if (maxPeriods === 0 && allEntries.length > 0) {
          maxPeriods = Math.max(...allEntries.map(e => e.period as number));
        }
      }
    } catch (err) {
      // Collection might not exist yet
      console.log("timetable_entries collection not found or empty:", err);
    }

    // Get breaks from time_grid
    type BreakInfo = { id: string; name: string; duration: number; afterPeriod: number; isHard: boolean };
    const gridConfig = timeGridData[0] as { breaks?: BreakInfo[] } || {};
    const breaks = (gridConfig.breaks || []).map(b => ({
      afterPeriod: b.afterPeriod,
      name: b.name,
      duration: b.duration
    }));

    // Get static courses from disciplines
    const disciplinesData = await pb.collection("disciplines").getFullList({ requestKey: null });
    type StaticCourse = { id: string; name: string; day: number; period: number; color: string };
    type DisciplineData = { id: string; staticCourses?: StaticCourse[] };
    
    const staticCourses: { classId: string; day: number; period: number; name: string; color: string }[] = [];
    for (const cls of classesData) {
      const disciplineId = (cls as { discipline?: string }).discipline;
      const discipline = disciplinesData.find(d => d.id === disciplineId) as DisciplineData | undefined;
      const courses = discipline?.staticCourses || [];
      courses.forEach(course => {
        staticCourses.push({
          classId: cls.id,
          day: course.day,
          period: course.period,
          name: course.name,
          color: course.color
        });
      });
    }

    res.json({
      generationId,
      entries,
      classes,
      subjects,
      teachers,
      maxPeriods,
      breaks,
      staticCourses
    });
  } catch (error) {
    console.error("Failed to fetch timetable data:", error);
    res.status(500).json({ error: "Failed to fetch timetable data" });
  }
});

// POST /api/timetable/generate - Start timetable generation
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { rules } = req.body;
    res.json({
      status: "placeholder",
      message: "Timetable generation algorithm not yet implemented",
      rulesReceived: rules?.length || 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate timetable" });
  }
});

// GET /api/timetable/:classId - Get generated timetable for a class
router.get("/:classId", async (req: Request, res: Response) => {
  try {
    res.json({
      status: "placeholder",
      classId: req.params.classId,
      message: "Timetable retrieval not yet implemented",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch timetable" });
  }
});

// GET /api/timetable/teacher/:teacherId - Get teacher's schedule
router.get("/teacher/:teacherId", async (req: Request, res: Response) => {
  try {
    res.json({
      status: "placeholder",
      teacherId: req.params.teacherId,
      message: "Teacher schedule retrieval not yet implemented",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch teacher schedule" });
  }
});

export default router;
