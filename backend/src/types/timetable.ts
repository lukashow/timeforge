/**
 * TypeScript interfaces for MiniZinc timetable generation input/output
 */

// ============ INPUT STRUCTURE ============

/**
 * Constraint flags that can be enabled/disabled for scheduling rules
 */
export interface ConstraintFlags {
  // Teacher constraints
  MAX_TEACHER_CONSECUTIVE_PERIODS: number;  // Max periods a teacher can teach consecutively
  TEACHER_DAILY_LOAD_BALANCE: boolean;      // Try to balance teacher load across days
  MINIMIZE_TEACHER_GAPS: boolean;           // Minimize gaps between teacher's classes (reduce waiting time)
  
  // Subject placement constraints
  PE_CLASS_AFTER_RECESS: boolean;           // Place PE classes after recess (mid-morning break)
  NO_CONSECUTIVE_SAME_SUBJECT: boolean;     // Don't schedule same subject in consecutive periods
  NO_HARD_SUBJECTS_AFTER_LUNCH: boolean;    // Avoid math/physics/chemistry right after lunch
  HARD_SUBJECTS_IN_MORNING: boolean;        // Prefer hard subjects in morning when students are fresh
  
  // Double period constraints  
  ALLOW_DOUBLE_PERIODS: boolean;            // Allow 2-period blocks for some subjects
  LAB_REQUIRES_DOUBLE_PERIOD: boolean;      // Lab subjects must be scheduled as double periods
  DOUBLE_PERIOD_NO_RECESS: boolean;         // Double periods cannot span across recess/break time
  
  // Room constraints
  RESPECT_ROOM_CAPACITY: boolean;           // Consider room capacity
  LAB_SUBJECTS_NEED_LAB_ROOM: boolean;      // Lab subjects must be in lab rooms
}

/**
 * Default constraint flags
 */
export const DEFAULT_FLAGS: ConstraintFlags = {
  MAX_TEACHER_CONSECUTIVE_PERIODS: 3,
  TEACHER_DAILY_LOAD_BALANCE: true,
  MINIMIZE_TEACHER_GAPS: true,
  PE_CLASS_AFTER_RECESS: false,
  NO_CONSECUTIVE_SAME_SUBJECT: true,
  NO_HARD_SUBJECTS_AFTER_LUNCH: false,
  HARD_SUBJECTS_IN_MORNING: false,
  ALLOW_DOUBLE_PERIODS: true,
  LAB_REQUIRES_DOUBLE_PERIOD: true,
  DOUBLE_PERIOD_NO_RECESS: true,
  RESPECT_ROOM_CAPACITY: true,
  LAB_SUBJECTS_NEED_LAB_ROOM: true,
};

/**
 * Time slot information (for recess/lunch identification)
 */
export interface TimeSlotInfo {
  period: number;
  isRecess: boolean;     // Is this period right after a break?
  isAfterLunch: boolean; // Is this period right after lunch?
  isMorning: boolean;    // Is this a morning period?
}

/**
 * Main input structure for MiniZinc timetable generation
 */
export interface TimetableInput {
  // ====== DIMENSIONS ======
  numClasses: number;
  numTeachers: number;
  numSubjects: number;
  numRooms: number;
  numPeriodsPerDay: number;
  numDays: number;  // Typically 5 (Mon-Fri)
  
  // ====== ID MAPPINGS ======
  // Maps internal indices (1-indexed for MiniZinc) to database IDs
  classIds: string[];     // classIds[mzIndex-1] = databaseId
  teacherIds: string[];   // teacherIds[mzIndex-1] = databaseId  
  subjectIds: string[];   // subjectIds[mzIndex-1] = databaseId
  roomIds: string[];      // roomIds[mzIndex-1] = databaseId
  
  // ====== TEACHER-SUBJECT MAPPING ======
  // teacherSubject[t] = subject index that teacher t teaches (1-indexed)
  teacherSubject: number[];
  
  // ====== CLASS-SUBJECT REQUIREMENTS ======
  // classSubjectPeriods[c][s] = number of periods per week class c needs for subject s
  classSubjectPeriods: number[][];
  
  // ====== ASSIGNMENT MAPPING ======
  // teacherForClassSubject[c][s] = teacher index assigned to teach subject s to class c (0 if none)
  teacherForClassSubject: number[][];
  
  // ====== UNAVAILABILITY ======
  // teacherUnavailable[t][day][period] = true if teacher t is unavailable at that slot
  teacherUnavailable: boolean[][][];
  
  // ====== SUBJECT PROPERTIES ======
  subjectNeedsLab: boolean[];       // Does this subject require a lab room?
  subjectIsHard: boolean[];         // Is this a "hard" subject (math, physics, etc.)?
  subjectIsPE: boolean[];           // Is this PE/sports?
  subjectAllowDouble: boolean[];    // Can this subject be scheduled as double period?
  
  // ====== ROOM PROPERTIES ======
  roomIsLab: boolean[];             // Is this room a lab?
  roomCapacity: number[];           // Room capacity (for future use)
  
  // ====== TIME SLOT PROPERTIES ======
  timeSlotInfo: TimeSlotInfo[][];   // timeSlotInfo[day][period]
  
  // ====== CONSTRAINT FLAGS ======
  flags: ConstraintFlags;
}

// ============ OUTPUT STRUCTURE ============

/**
 * Single timetable entry in the solution
 */
export interface TimetableEntry {
  classIndex: number;
  subjectIndex: number;
  teacherIndex: number;
  roomIndex: number;
  day: number;       // 1-5 (Mon-Fri)
  period: number;    // 1-N
  isDoublePeriod: boolean;
}

/**
 * Conflict or warning from the solver
 */
export interface ScheduleConflict {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  affectedClasses?: string[];
  affectedTeachers?: string[];
  day?: number;
  period?: number;
}

/**
 * Statistics from the solver
 */
export interface SolveStatistics {
  solveTimeMs: number;
  nodes: number;
  solutions: number;
  failures: number;
  restarts: number;
}

/**
 * Complete output from MiniZinc solver
 */
export interface TimetableOutput {
  status: 'optimal' | 'satisfied' | 'unsatisfied' | 'unbounded' | 'unknown' | 'error';
  timetable: TimetableEntry[];
  statistics: SolveStatistics;
  conflicts: ScheduleConflict[];
  
  // Summary stats
  totalPeriods: number;
  successRate: number;
  unscheduledPeriods: number;
}

/**
 * Generation request from frontend
 */
export interface GenerationRequest {
  flags?: Partial<ConstraintFlags>;
  timeoutMs?: number;  // Max solve time
  findOptimal?: boolean;  // Try to find optimal vs first satisfactory
}

/**
 * Generation response to frontend
 */
export interface GenerationResponse {
  success: boolean;
  generationId: string;
  output?: TimetableOutput;
  error?: string;
  estimatedTimeMs?: number;
}
