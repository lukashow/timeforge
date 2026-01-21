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

  // Get time grid settings with proper fallbacks
  const gridConfig = timeGrid[0] as { workDays?: number[] | Record<string, boolean>; periods?: { id: string; startTime: string; endTime: string; type: string }[] } || {};
  
  // Handle workDays - could be array or object from different time_grid formats
  let workDaysArray: number[];
  if (Array.isArray(gridConfig.workDays)) {
    workDaysArray = gridConfig.workDays;
  } else if (gridConfig.workDays && typeof gridConfig.workDays === 'object') {
    // Convert object like {monday: true, tuesday: true} to array [1, 2]
    const dayMap: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
    workDaysArray = Object.entries(gridConfig.workDays)
      .filter(([_, enabled]) => enabled)
      .map(([day, _]) => dayMap[day.toLowerCase()] || 0)
      .filter(d => d > 0);
  } else {
    workDaysArray = [1, 2, 3, 4, 5]; // Default Mon-Fri
  }
  
  const periods = Array.isArray(gridConfig.periods) ? gridConfig.periods : [];
  
  const numDays = workDaysArray.length || 5;
  const numPeriodsPerDay = periods.filter(p => p.type === 'class').length || 8;

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
  const classPeriods = periods.filter(p => p.type === 'class');
  const timeSlotInfo = workDaysArray.map(() => 
    classPeriods.length > 0 
      ? classPeriods.map((period, idx) => {
          const startHour = parseInt(period.startTime?.split(":")[0] || "8");
          return {
            period: idx + 1,
            isRecess: idx === 2 || idx === 3,
            isAfterLunch: startHour >= 13 && startHour <= 14,
            isMorning: startHour < 12,
          };
        })
      : Array(numPeriodsPerDay).fill(null).map((_, idx) => ({
          period: idx + 1,
          isRecess: idx === 2 || idx === 3,
          isAfterLunch: idx >= 4 && idx <= 5,
          isMorning: idx < 4,
        }))
  );

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
  // Rough estimate: 1ms per 10 complexity units, minimum 5 seconds
  return Math.max(5000, complexity / 10);
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
    const timeoutMs = request.timeoutMs || 60000; // Default 60 second timeout
    
    const generationId = generateId();
    console.log(`Starting generation ${generationId}`);
    
    // Collect data
    const input = await collectTimetableData(flags);
    const estimatedMs = estimateSolveTime(input);
    
    console.log(`Problem size: ${input.numClasses} classes, ${input.numTeachers} teachers, ${input.numSubjects} subjects`);
    console.log(`Estimated time: ${estimatedMs}ms`);
    
    // Check if model file exists
    if (!fs.existsSync(MZN_MODEL_PATH)) {
      return res.status(500).json({ 
        success: false, 
        error: `MiniZinc model file not found at ${MZN_MODEL_PATH}` 
      });
    }
    
    // Use CLI runner for parallel thread support
    const { runMiniZinc } = await import("@/minizinc/cli-runner.ts");
    
    const cliResult = await runMiniZinc(
      MZN_MODEL_PATH,
      inputToMiniZincData(input),
      {
        solver: "gecode",
        timeLimit: timeoutMs,
        threads: Math.max(1, require('os').cpus().length - 1),
      }
    );
    
    console.log(`Generation complete. Status: ${cliResult.status}, Time: ${cliResult.solveTimeMs}ms`);
    
    // Map CLI result to TimetableOutput
    const isSuccess = cliResult.status === 'OPTIMAL_SOLUTION' || cliResult.status === 'SATISFIED';
    
    // Parse timetable from solution
    let timetableEntries: TimetableOutput['timetable'] = [];
    if (cliResult.solution && typeof cliResult.solution === 'object') {
      const sol = cliResult.solution as { timetable?: unknown[] };
      if (Array.isArray(sol.timetable)) {
        timetableEntries = sol.timetable.map((entry: unknown) => {
          const e = entry as { class: number; day: number; period: number; subject: number; room: number; teacher: number };
          return {
            classIndex: e.class,
            subjectIndex: e.subject,
            teacherIndex: e.teacher,
            roomIndex: e.room,
            day: e.day,
            period: e.period,
            isDoublePeriod: false,
          };
        });
      }
    }
    
    const output: TimetableOutput = {
      status: isSuccess ? 'satisfied' : (cliResult.status === 'ERROR' ? 'error' : 'unknown'),
      timetable: timetableEntries,
      statistics: {
        solveTimeMs: cliResult.solveTimeMs,
        nodes: 0,
        solutions: 1,
        failures: 0,
        restarts: 0,
      },
      conflicts: [],
      totalPeriods: input.numClasses * input.numDays * input.numPeriodsPerDay,
      successRate: isSuccess ? 100 : 0,
      unscheduledPeriods: 0,
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
