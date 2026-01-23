import { Router } from "express";
import type { Request, Response } from "express";
// Note: Using CLI runner instead of minizinc-js for parallel thread support
import { pb } from "@/lib/pocketbase.ts";
import { DEFAULT_FLAGS } from "@/types/timetable.ts";
import type { 
  TimetableInput, 
  TimetableOutput, 
  GenerationRequest, 
  GenerationResponse,
  ConstraintFlags,
} from "@/types/timetable.ts";
import * as fs from "fs";
import * as path from "path";

const router = Router();

// Path to the MiniZinc model file
const MZN_MODEL_PATH = path.join(__dirname, "../minizinc/timetable.mzn");

/**
 * Helper to generate unique ID
 */
function generateId(): string {
  return `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Collect all data from PocketBase and build MiniZinc input
 */
async function collectTimetableData(flags: ConstraintFlags): Promise<TimetableInput> {
  // Fetch all necessary data from PocketBase
  const [classes, teachers, subjects, rooms, assignments, disciplines, timeGrid] = await Promise.all([
    pb.collection("classes").getFullList({ requestKey: null }),
    pb.collection("teachers").getFullList({ requestKey: null }),
    pb.collection("subjects").getFullList({ requestKey: null }),
    pb.collection("rooms").getFullList({ requestKey: null }),
    pb.collection("assignments").getFullList({ requestKey: null }),
    pb.collection("disciplines").getFullList({ requestKey: null }),
    pb.collection("time_grid").getFullList({ requestKey: null }),
  ]);

  // Get time grid settings - match the frontend format exactly
  const gridConfig = timeGrid[0] as { 
    workDays?: number | number[] | Record<string, boolean>; 
    periodsPerDay?: number;
    selectedDays?: number[];
    periods?: { id: string; startTime: string; endTime: string; type: string }[];
    breaks?: { id: string; name: string; duration: number; isHard: boolean; afterPeriod: number }[];
  } || {};
  
  // Get number of work days
  let numDays: number;
  if (typeof gridConfig.workDays === 'number') {
    numDays = gridConfig.workDays;
  } else if (Array.isArray(gridConfig.selectedDays)) {
    numDays = gridConfig.selectedDays.length;
  } else if (Array.isArray(gridConfig.workDays)) {
    numDays = gridConfig.workDays.length;
  } else {
    numDays = 5; // Default Mon-Fri
  }
  
  // Get periods per day - prioritize periodsPerDay field
  let numPeriodsPerDay: number;
  if (gridConfig.periodsPerDay && gridConfig.periodsPerDay > 0) {
    numPeriodsPerDay = gridConfig.periodsPerDay;
  } else if (Array.isArray(gridConfig.periods) && gridConfig.periods.length > 0) {
    numPeriodsPerDay = gridConfig.periods.length;
  } else {
    console.error("No periods configured in time_grid! periodsPerDay is not set.");
    throw new Error("请先在第一步配置作息时间（节次）");
  }
  
  console.log(`Time grid: ${numDays} days, ${numPeriodsPerDay} periods/day`);

  // Create ID mappings (MiniZinc uses 1-indexed)
  const classIds = classes.map(c => c.id);
  const teacherIds = teachers.map(t => t.id);
  const subjectIds = subjects.map(s => s.id);
  const roomIds = rooms.map(r => r.id);

  // Build teacher-subject mapping
  const teacherSubject: number[] = teachers.map(t => {
    const subjectId = (t as { subject?: string }).subject;
    const idx = subjectIds.indexOf(subjectId || "");
    return idx >= 0 ? idx + 1 : 0; // 1-indexed, 0 = no subject
  });

  // Build class-subject periods matrix
  const classSubjectPeriods: number[][] = classes.map(cls => {
    const discipline = disciplines.find(d => d.id === (cls as { discipline?: string }).discipline);
    const allocations = (discipline as { subjectAllocations?: { subjectId: string; totalPeriods: number }[] })?.subjectAllocations || [];
    
    return subjects.map(subj => {
      const alloc = allocations.find(a => a.subjectId === subj.id);
      return alloc?.totalPeriods || 0;
    });
  });

  // Build teacher-for-class-subject matrix
  const teacherForClassSubject: number[][] = classes.map(cls => {
    return subjects.map(subj => {
      const assignment = assignments.find(a => 
        (a as { class?: string }).class === cls.id && 
        (a as { subject?: string }).subject === subj.id
      );
      const teacherId = (assignment as { teacher?: string })?.teacher;
      const teacherIdx = teacherIds.indexOf(teacherId || "");
      return teacherIdx >= 0 ? teacherIdx + 1 : 0;
    });
  });

  // Build teacher unavailability (for now, use empty - can be extended later)
  const teacherUnavailable: boolean[][][] = teachers.map(() => 
    Array(numDays).fill(null).map(() => 
      Array(numPeriodsPerDay).fill(false)
    )
  );

  // Subject properties
  const subjectNeedsLab = subjects.map(s => (s as { needsLab?: boolean }).needsLab || false);
  const subjectIsHard = subjects.map(s => {
    const name = (s as { name?: string }).name || "";
    return ["数学", "物理", "化学", "英语", "语文"].some(hard => name.includes(hard));
  });
  const subjectIsPE = subjects.map(s => {
    const name = (s as { name?: string }).name || "";
    return ["体育", "PE"].some(pe => name.includes(pe));
  });
  const subjectAllowDouble = subjects.map(s => (s as { needsLab?: boolean }).needsLab || false);

  // Room properties
  const roomIsLab = rooms.map(r => {
    const tags = (r as { tags?: string[] }).tags || [];
    return tags.some(t => t.toLowerCase().includes("lab") || t.includes("实验"));
  });
  const roomCapacity = rooms.map(() => 50); // Default capacity

  // Time slot properties
  const periods = Array.isArray(gridConfig.periods) ? gridConfig.periods : [];
  const classPeriods = periods.filter((p: { type?: string }) => p.type === 'class');
  
  // Get break info from gridConfig
  type BreakInfo = { afterPeriod: number; isHard: boolean };
  const breaks: BreakInfo[] = (gridConfig.breaks || []) as BreakInfo[];
  // Build a set of period indices that come after a break (these cannot start a double that spans the break)
  const breakAfterPeriods = new Set(breaks.map(b => b.afterPeriod));  // e.g., {2, 4} means break after period 2 and 4
  
  console.log(`Breaks after periods: ${Array.from(breakAfterPeriods).join(', ')}`);
  
  const timeSlotInfo = Array(numDays).fill(null).map(() => 
    classPeriods.length > 0 
      ? classPeriods.map((period: { startTime?: string }, idx: number) => {
          const startHour = parseInt(period.startTime?.split(":")[0] || "8");
          const periodNum = idx + 1;  // 1-indexed
          return {
            period: periodNum,
            isRecess: breakAfterPeriods.has(periodNum),  // This period is followed by a break
            isAfterLunch: startHour >= 13 && startHour <= 14,
            isMorning: startHour < 12,
          };
        })
      : Array(numPeriodsPerDay).fill(null).map((_, idx: number) => {
          const periodNum = idx + 1;
          return {
            period: periodNum,
            isRecess: breakAfterPeriods.has(periodNum),  // Use actual breaks
            isAfterLunch: periodNum >= 5 && periodNum <= 6,  // Default assumption
            isMorning: periodNum <= 4,
          };
        })
  );

  // Build static courses for each class from their discipline
  // Format: [{classIndex, day, period, name}]
  type StaticCourse = { id: string; name: string; day: number; period: number; color: string };
  const staticCourses: { classIndex: number; day: number; period: number; name: string }[] = [];
  classes.forEach((cls, classIdx) => {
    const discipline = disciplines.find(d => d.id === (cls as { discipline?: string }).discipline);
    const courses = (discipline as { staticCourses?: StaticCourse[] })?.staticCourses || [];
    courses.forEach(course => {
      staticCourses.push({
        classIndex: classIdx,
        day: course.day,
        period: course.period,
        name: course.name
      });
    });
  });
  console.log(`Static courses: ${staticCourses.length} fixed slots`);

  return {
    numClasses: classes.length,
    numTeachers: teachers.length,
    numSubjects: subjects.length,
    numRooms: rooms.length,
    numPeriodsPerDay,
    numDays,
    classIds,
    teacherIds,
    subjectIds,
    roomIds,
    teacherSubject,
    classSubjectPeriods,
    teacherForClassSubject,
    teacherUnavailable,
    subjectNeedsLab,
    subjectIsHard,
    subjectIsPE,
    subjectAllowDouble,
    roomIsLab,
    roomCapacity,
    timeSlotInfo,
    staticCourses,
    flags,
  };
}

/**
 * Convert TimetableInput to MiniZinc data format
 */
function inputToMiniZincData(input: TimetableInput): Record<string, unknown> {
  return {
    num_classes: input.numClasses,
    num_teachers: input.numTeachers,
    num_subjects: input.numSubjects,
    num_rooms: input.numRooms,
    num_periods_per_day: input.numPeriodsPerDay,
    num_days: input.numDays,
    
    class_subject_periods: input.classSubjectPeriods,
    teacher_for_class_subject: input.teacherForClassSubject,
    teacher_unavailable: input.teacherUnavailable,
    
    subject_needs_lab: input.subjectNeedsLab,
    subject_is_hard: input.subjectIsHard,
    subject_is_pe: input.subjectIsPE,
    
    room_is_lab: input.roomIsLab,
    
    // Time slot properties
    slot_is_after_recess: input.timeSlotInfo.map(day => day.map(s => s.isRecess)),
    slot_is_after_lunch: input.timeSlotInfo.map(day => day.map(s => s.isAfterLunch)),
    slot_is_morning: input.timeSlotInfo.map(day => day.map(s => s.isMorning)),
    // slot_is_break: true if this period comes right after a break (for double period constraint)
    slot_is_break: input.timeSlotInfo.map(day => day.map(s => s.isRecess || s.isAfterLunch)),
    
    // Constraint flags
    MAX_TEACHER_CONSECUTIVE: input.flags.MAX_TEACHER_CONSECUTIVE_PERIODS,
    FLAG_TEACHER_DAILY_BALANCE: input.flags.TEACHER_DAILY_LOAD_BALANCE,
    FLAG_PE_AFTER_RECESS: input.flags.PE_CLASS_AFTER_RECESS,
    FLAG_NO_CONSECUTIVE_SAME_SUBJECT: input.flags.NO_CONSECUTIVE_SAME_SUBJECT,
    FLAG_NO_HARD_AFTER_LUNCH: input.flags.NO_HARD_SUBJECTS_AFTER_LUNCH,
    FLAG_HARD_IN_MORNING: input.flags.HARD_SUBJECTS_IN_MORNING,
    FLAG_LAB_NEEDS_LAB_ROOM: input.flags.LAB_SUBJECTS_NEED_LAB_ROOM,
    FLAG_DOUBLE_PERIOD_NO_RECESS: input.flags.DOUBLE_PERIOD_NO_RECESS,
    FLAG_MINIMIZE_TEACHER_GAPS: input.flags.MINIMIZE_TEACHER_GAPS,
  };
}

/**
 * Estimate solve time based on problem size
 */
function estimateSolveTime(input: TimetableInput): number {
  const complexity = input.numClasses * input.numSubjects * input.numDays * input.numPeriodsPerDay;
  return Math.max(5000, complexity / 2);
}

// ============ ROUTES ============

// GET /api/generation/estimate - Get estimated time for generation
router.get("/estimate", async (_req: Request, res: Response) => {
  try {
    const input = await collectTimetableData(DEFAULT_FLAGS);
    const estimatedMs = estimateSolveTime(input);
    
    res.json({
      estimatedTimeMs: estimatedMs,
      problemSize: {
        classes: input.numClasses,
        teachers: input.numTeachers,
        subjects: input.numSubjects,
        periods: input.numPeriodsPerDay,
        days: input.numDays,
        totalSlots: input.numClasses * input.numDays * input.numPeriodsPerDay,
      },
    });
  } catch (error) {
    console.error("Estimate error:", error);
    res.status(500).json({ error: "Failed to estimate generation time" });
  }
});

// POST /api/generation/generate - Start timetable generation
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const request: GenerationRequest = req.body || {};
    const flags: ConstraintFlags = { ...DEFAULT_FLAGS, ...request.flags };
    const timeoutMs = request.timeoutMs || 300000; // Default 300 second (5 minute) timeout
    
    const generationId = generateId();
    console.log(`Starting generation ${generationId}`);
    
    // Collect data
    const input = await collectTimetableData(flags);
    const estimatedMs = estimateSolveTime(input);
    
    console.log(`Problem size: ${input.numClasses} classes, ${input.numTeachers} teachers, ${input.numSubjects} subjects`);
    console.log(`Estimated time: ${estimatedMs}ms`);
    
    // Use OR-Tools Python solver
    const { runSolver } = await import("@/or-tools/runner.ts");
    
    // Convert input to OR-Tools format
    const solverInput = {
      num_classes: input.numClasses,
      num_teachers: input.numTeachers,
      num_subjects: input.numSubjects,
      num_rooms: input.numRooms,
      num_periods_per_day: input.numPeriodsPerDay,
      num_days: input.numDays,
      class_subject_periods: input.classSubjectPeriods,
      teacher_for_class_subject: input.teacherForClassSubject,
      slot_is_break: input.timeSlotInfo.map(day => day.map(s => s.isRecess || s.isAfterLunch)),
      static_courses: input.staticCourses.map(sc => ({
        class_index: sc.classIndex,
        day: sc.day,  // Already 0-indexed from frontend (0=Monday, 1=Tuesday, etc.)
        period: sc.period - 1,  // Convert to 0-indexed (frontend uses 1-indexed periods)
        name: sc.name
      })),
      MAX_TEACHER_CONSECUTIVE: flags.MAX_TEACHER_CONSECUTIVE_PERIODS,
      FLAG_NO_CONSECUTIVE_SAME_SUBJECT: flags.NO_CONSECUTIVE_SAME_SUBJECT,
      FLAG_DOUBLE_PERIOD_NO_RECESS: flags.DOUBLE_PERIOD_NO_RECESS,
      FLAG_MINIMIZE_TEACHER_GAPS: flags.MINIMIZE_TEACHER_GAPS,
      timeout_seconds: Math.floor(timeoutMs / 1000),
    };
    
    const solverResult = await runSolver(solverInput);
    
    console.log(`Generation complete. Status: ${solverResult.status}, Time: ${solverResult.solve_time_seconds}s`);
    
    // Map result to TimetableOutput
    const isSuccess = solverResult.success;
    
    // Parse timetable entries
    const timetableEntries: TimetableOutput['timetable'] = solverResult.timetable.map(entry => ({
      classIndex: entry.class,
      subjectIndex: entry.subject,
      teacherIndex: entry.teacher,
      roomIndex: 0,
      day: entry.day,
      period: entry.period,
      isDoublePeriod: false,
    }));
    
    // If successful, save to PocketBase
    if (isSuccess && timetableEntries.length > 0) {
      try {
        // Get class/subject/teacher IDs for mapping
        const [classes, subjects, teachers] = await Promise.all([
          pb.collection("classes").getFullList({ requestKey: null }),
          pb.collection("subjects").getFullList({ requestKey: null }),
          pb.collection("teachers").getFullList({ requestKey: null }),
        ]);
        
        // Create timetable entries in batches
        const batchSize = 100;
        for (let i = 0; i < timetableEntries.length; i += batchSize) {
          const batch = timetableEntries.slice(i, i + batchSize);
          await Promise.all(batch.map(async (entry) => {
            // Skip free periods (subject = 0) - static courses are handled separately
            if (entry.subjectIndex === 0) return;
            
            const classId = classes[entry.classIndex - 1]?.id;
            const subjectId = entry.subjectIndex > 0 ? subjects[entry.subjectIndex - 1]?.id : null;
            const teacherId = entry.teacherIndex > 0 ? teachers[entry.teacherIndex - 1]?.id : null;
            
            if (classId) {
              try {
                await pb.collection("timetable_entries").create({
                  generation_id: generationId,
                  class_id: classId,
                  subject_id: subjectId || null,
                  teacher_id: teacherId || null,
                  day: entry.day,
                  period: entry.period,
                  is_free: false,
                }, { requestKey: null });
              } catch (err) {
                console.error(`Failed to save entry for class ${entry.classIndex}, day ${entry.day}, period ${entry.period}:`, err);
              }
            }
          }));
        }
        const scheduledCount = timetableEntries.filter(e => e.subjectIndex > 0).length;
        console.log(`Saved ${scheduledCount} scheduled entries to PocketBase`);
        
        // ============ SAVE STATIC COURSES DIRECTLY =============
        // Static courses are saved separately, not through the solver
        for (const sc of input.staticCourses) {
          const classId = classes[sc.classIndex]?.id;
          if (classId && sc.day >= 0 && sc.period >= 1) {
            try {
              await pb.collection("timetable_entries").create({
                generation_id: generationId,
                class_id: classId,
                subject_id: null,
                teacher_id: null,
                day: sc.day + 1,    // Convert 0-indexed day to 1-indexed for storage
                period: sc.period,  // Already 1-indexed
                is_free: false,
                static_name: sc.name,
              }, { requestKey: null });
            } catch (err) {
              console.error(`Failed to save static course for class ${sc.classIndex}:`, err);
            }
          }
        }
        console.log(`Saved ${input.staticCourses.length} static course entries`);
      } catch (err) {
        console.error("Failed to save timetable to PocketBase:", err);
      }
    }
    
    const output: TimetableOutput = {
      status: isSuccess ? 'satisfied' : 'unknown',
      timetable: timetableEntries,
      statistics: {
        solveTimeMs: Math.round(solverResult.solve_time_seconds * 1000),
        nodes: 0,
        solutions: 1,
        failures: 0,
        restarts: 0,
      },
      conflicts: [],
      totalPeriods: input.numClasses * input.numDays * input.numPeriodsPerDay,
      successRate: isSuccess ? 100 : 0,
      unscheduledPeriods: timetableEntries.filter(e => e.subjectIndex === 0).length,
    };
    
    const response: GenerationResponse = {
      success: isSuccess,
      generationId,
      output,
      estimatedTimeMs: estimatedMs,
    };
    
    res.json(response);
  } catch (error: unknown) {
    console.error("Generation error:", error);
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.stack) console.error("Stack:", error.stack);
    } else if (error && typeof error === 'object') {
      try {
        errorMessage = JSON.stringify(error, null, 2);
      } catch {
        errorMessage = String(error);
      }
    } else {
      errorMessage = String(error);
    }
    res.status(500).json({ 
      success: false, 
      error: "Failed to generate timetable",
      details: errorMessage,
    });
  }
});

// GET /api/generation/input - Get the input data that would be passed to MiniZinc (for debugging)
router.get("/input", async (_req: Request, res: Response) => {
  try {
    const input = await collectTimetableData(DEFAULT_FLAGS);
    res.json(input);
  } catch (error) {
    console.error("Input collection error:", error);
    res.status(500).json({ error: "Failed to collect input data" });
  }
});

export default router;
