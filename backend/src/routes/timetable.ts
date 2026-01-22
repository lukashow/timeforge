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

      if (latestEntry.items.length > 0 && latestEntry.items[0]) {
        generationId = (latestEntry.items[0].generation_id as string) || null;
        
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
// This forwards to the generation router's logic
router.post("/generate", async (req: Request, res: Response) => {
  try {
    // Import the generation logic dynamically
    const { runSolver } = await import("@/or-tools/runner.ts");
    const { DEFAULT_FLAGS } = await import("@/types/timetable.ts");
    
    // Collect data from PocketBase
    const [classes, teachers, subjects, rooms, assignments, disciplines, timeGrid] = await Promise.all([
      pb.collection("classes").getFullList({ requestKey: null }),
      pb.collection("teachers").getFullList({ requestKey: null }),
      pb.collection("subjects").getFullList({ requestKey: null }),
      pb.collection("rooms").getFullList({ requestKey: null }),
      pb.collection("assignments").getFullList({ requestKey: null }),
      pb.collection("disciplines").getFullList({ requestKey: null }),
      pb.collection("time_grid").getFullList({ requestKey: null }),
    ]);

    // Get time grid config
    const gridConfig = timeGrid[0] as { periodsPerDay?: number; workDays?: number; periods?: unknown[]; breaks?: unknown[] } || {};
    const numPeriodsPerDay = gridConfig.periodsPerDay || 8;
    const numDays = typeof gridConfig.workDays === 'number' ? gridConfig.workDays : 5;

    // Build class-subject periods matrix
    const classSubjectPeriods = classes.map(cls => {
      const discipline = disciplines.find(d => d.id === (cls as { discipline?: string }).discipline);
      const allocations = (discipline as { subjectAllocations?: { subjectId: string; totalPeriods: number }[] })?.subjectAllocations || [];
      return subjects.map(subj => {
        const alloc = allocations.find(a => a.subjectId === subj.id);
        return alloc?.totalPeriods || 0;
      });
    });

    // Build teacher-for-class-subject matrix
    const teacherForClassSubject = classes.map(cls => {
      return subjects.map(subj => {
        const assignment = assignments.find(a => 
          (a as { class?: string }).class === cls.id && 
          (a as { subject?: string }).subject === subj.id
        );
        const teacherId = (assignment as { teacher?: string })?.teacher;
        const teacherIdx = teachers.findIndex(t => t.id === teacherId);
        return teacherIdx >= 0 ? teacherIdx + 1 : 0;
      });
    });

    // Build static courses
    type StaticCourse = { id: string; name: string; day: number; period: number; color: string };
    const staticCourses: { class_index: number; day: number; period: number; name: string }[] = [];
    classes.forEach((cls, classIdx) => {
      const discipline = disciplines.find(d => d.id === (cls as { discipline?: string }).discipline);
      const courses = (discipline as { staticCourses?: StaticCourse[] })?.staticCourses || [];
      courses.forEach(course => {
        staticCourses.push({
          class_index: classIdx,
          day: course.day,
          period: course.period - 1,
          name: course.name
        });
      });
    });

    // Build slot_is_break
    const slotIsBreak = Array(numDays).fill(null).map(() => 
      Array(numPeriodsPerDay).fill(false)
    );

    // Run solver
    const solverInput = {
      num_classes: classes.length,
      num_teachers: teachers.length,
      num_subjects: subjects.length,
      num_rooms: rooms.length,
      num_periods_per_day: numPeriodsPerDay,
      num_days: numDays,
      class_subject_periods: classSubjectPeriods,
      teacher_for_class_subject: teacherForClassSubject,
      slot_is_break: slotIsBreak,
      static_courses: staticCourses,
      MAX_TEACHER_CONSECUTIVE: DEFAULT_FLAGS.MAX_TEACHER_CONSECUTIVE_PERIODS,
      FLAG_NO_CONSECUTIVE_SAME_SUBJECT: DEFAULT_FLAGS.NO_CONSECUTIVE_SAME_SUBJECT,
      FLAG_DOUBLE_PERIOD_NO_RECESS: DEFAULT_FLAGS.DOUBLE_PERIOD_NO_RECESS,
      FLAG_MINIMIZE_TEACHER_GAPS: DEFAULT_FLAGS.MINIMIZE_TEACHER_GAPS,
      timeout_seconds: 300,
    };

    const solverResult = await runSolver(solverInput);
    const generationId = `gen_${Date.now()}`;

    // Save to PocketBase if successful
    if (solverResult.success && solverResult.timetable.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < solverResult.timetable.length; i += batchSize) {
        const batch = solverResult.timetable.slice(i, i + batchSize);
        await Promise.all(batch.map(async (entry) => {
          if (entry.subject === 0) return;
          const classId = classes[entry.class - 1]?.id;
          const subjectId = entry.subject > 0 ? subjects[entry.subject - 1]?.id : null;
          const teacherId = entry.teacher > 0 ? teachers[entry.teacher - 1]?.id : null;
          if (classId) {
            await pb.collection("timetable_entries").create({
              generation_id: generationId,
              class_id: classId,
              subject_id: subjectId,
              teacher_id: teacherId,
              day: entry.day,
              period: entry.period,
              is_free: false,
            }, { requestKey: null });
          }
        }));
      }
      // Save static courses
      for (const sc of staticCourses) {
        const classId = classes[sc.class_index]?.id;
        if (classId) {
          await pb.collection("timetable_entries").create({
            generation_id: generationId,
            class_id: classId,
            day: sc.day + 1,
            period: sc.period + 1,
            is_free: false,
            static_name: sc.name,
          }, { requestKey: null });
        }
      }
    }

    res.json({
      success: solverResult.success,
      generationId,
      status: solverResult.success ? 'satisfied' : 'failed',
      solveTime: solverResult.solve_time_seconds,
      entriesCount: solverResult.timetable.length,
    });
  } catch (error) {
    console.error("Generation error:", error);
    res.status(500).json({ error: "Failed to generate timetable", details: String(error) });
  }
});

// GET /api/timetable/:classId - Get generated timetable for a class
router.get("/:classId", async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    
    // Get entries for this class
    const entries = await pb.collection("timetable_entries").getFullList({
      filter: `class_id = "${classId}"`,
      sort: 'day,period',
      requestKey: null,
    });
    
    // Get subject info for mapping
    const subjects = await pb.collection("subjects").getFullList({ requestKey: null });
    const teachers = await pb.collection("teachers").getFullList({ requestKey: null });
    
    const formattedEntries = entries.map(e => ({
      day: e.day,
      period: e.period,
      subjectId: e.subject_id,
      subjectName: subjects.find(s => s.id === e.subject_id)?.name || e.static_name || '',
      teacherId: e.teacher_id,
      teacherName: teachers.find(t => t.id === e.teacher_id)?.name || '',
      isStatic: !!e.static_name,
    }));
    
    res.json({
      classId,
      entries: formattedEntries,
    });
  } catch (error) {
    console.error("Failed to fetch class timetable:", error);
    res.status(500).json({ error: "Failed to fetch timetable" });
  }
});

// GET /api/timetable/teacher/:teacherId - Get teacher's schedule
router.get("/teacher/:teacherId", async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    
    // Get entries for this teacher
    const entries = await pb.collection("timetable_entries").getFullList({
      filter: `teacher_id = "${teacherId}"`,
      sort: 'day,period',
      requestKey: null,
    });
    
    // Get related info
    const [classes, subjects] = await Promise.all([
      pb.collection("classes").getFullList({ requestKey: null }),
      pb.collection("subjects").getFullList({ requestKey: null }),
    ]);
    
    const formattedEntries = entries.map(e => ({
      day: e.day,
      period: e.period,
      classId: e.class_id,
      className: classes.find(c => c.id === e.class_id)?.name || '',
      subjectId: e.subject_id,
      subjectName: subjects.find(s => s.id === e.subject_id)?.name || '',
    }));
    
    res.json({
      teacherId,
      entries: formattedEntries,
    });
  } catch (error) {
    console.error("Failed to fetch teacher schedule:", error);
    res.status(500).json({ error: "Failed to fetch teacher schedule" });
  }
});

export default router;

