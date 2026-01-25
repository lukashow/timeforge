/**
 * API Client for LavaPunk Timetable Backend
 */

const API_BASE = ""; // Vite proxies /api to backend

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============ SUBJECTS ============
export const subjects = {
  getAll: () => fetchAPI<Subject[]>("/api/subjects"),
  getOne: (id: string) => fetchAPI<Subject>(`/api/subjects/${id}`),
  create: (data: Omit<Subject, "id" | "created" | "updated">) =>
    fetchAPI<Subject>("/api/subjects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Subject>) =>
    fetchAPI<Subject>(`/api/subjects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/subjects/${id}`, { method: "DELETE" }),
};

// ============ TEACHERS ============
export const teachers = {
  getAll: () => fetchAPI<Teacher[]>("/api/teachers"),
  getOne: (id: string) => fetchAPI<Teacher>(`/api/teachers/${id}`),
  create: (data: Omit<Teacher, "id" | "created" | "updated">) =>
    fetchAPI<Teacher>("/api/teachers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Teacher>) =>
    fetchAPI<Teacher>(`/api/teachers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateUnavailable: (id: string, unavailable: number[][]) =>
    fetchAPI<Teacher>(`/api/teachers/${id}/unavailable`, {
      method: "PUT",
      body: JSON.stringify({ unavailable }),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/teachers/${id}`, { method: "DELETE" }),
};

// ============ ROOMS ============
export const rooms = {
  getAll: () => fetchAPI<Room[]>("/api/rooms"),
  getOne: (id: string) => fetchAPI<Room>(`/api/rooms/${id}`),
  create: (data: Omit<Room, "id" | "created" | "updated">) =>
    fetchAPI<Room>("/api/rooms", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createBulk: (prefix: string, startNum: number, endNum: number, tags?: string[]) =>
    fetchAPI<Room[]>("/api/rooms/bulk", {
      method: "POST",
      body: JSON.stringify({ prefix, startNum, endNum, tags }),
    }),
  update: (id: string, data: Partial<Room>) =>
    fetchAPI<Room>(`/api/rooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/rooms/${id}`, { method: "DELETE" }),
};

// ============ DISCIPLINES ============
export const disciplines = {
  getAll: () => fetchAPI<Discipline[]>("/api/disciplines"),
  getOne: (id: string) => fetchAPI<Discipline>(`/api/disciplines/${id}`),
  create: (data: Omit<Discipline, "id" | "created" | "updated">) =>
    fetchAPI<Discipline>("/api/disciplines", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Discipline>) =>
    fetchAPI<Discipline>(`/api/disciplines/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateAllocations: (id: string, subjectAllocations: SubjectAllocation[]) =>
    fetchAPI<Discipline>(`/api/disciplines/${id}/allocations`, {
      method: "PUT",
      body: JSON.stringify({ subjectAllocations }),
    }),
  updateStaticCourses: (id: string, staticCourses: StaticCourse[]) =>
    fetchAPI<Discipline>(`/api/disciplines/${id}/static-courses`, {
      method: "PUT",
      body: JSON.stringify({ staticCourses }),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/disciplines/${id}`, { method: "DELETE" }),
};

// ============ CLASSES ============
export const classes = {
  getAll: () => fetchAPI<ClassRecord[]>("/api/classes"),
  getOne: (id: string) => fetchAPI<ClassRecord>(`/api/classes/${id}`),
  create: (data: Omit<ClassRecord, "id" | "created" | "updated">) =>
    fetchAPI<ClassRecord>("/api/classes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createBulk: (prefix: string, startNum: number, endNum: number, category: string, discipline: string) =>
    fetchAPI<ClassRecord[]>("/api/classes/bulk", {
      method: "POST",
      body: JSON.stringify({ prefix, startNum, endNum, category, discipline }),
    }),
  update: (id: string, data: Partial<ClassRecord>) =>
    fetchAPI<ClassRecord>(`/api/classes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  assignFormTeacher: (id: string, formTeacher: string | null) =>
    fetchAPI<ClassRecord>(`/api/classes/${id}/form-teacher`, {
      method: "PUT",
      body: JSON.stringify({ formTeacher }),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/classes/${id}`, { method: "DELETE" }),
  clearFormTeachers: () =>
    fetchAPI<{ message: string }>("/api/classes/clear-form-teachers", {
      method: "POST",
    }),
};

// ============ ASSIGNMENTS ============
export const assignments = {
  getAll: () => fetchAPI<Assignment[]>("/api/assignments"),
  getByClass: (classId: string) => fetchAPI<Assignment[]>(`/api/assignments/by-class/${classId}`),
  create: (data: { class: string; subject: string; teacher?: string }) =>
    fetchAPI<Assignment>("/api/assignments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createBulk: (items: { class: string; subject: string; teacher?: string }[]) =>
    fetchAPI<Assignment[]>("/api/assignments/bulk", {
      method: "POST",
      body: JSON.stringify({ assignments: items }),
    }),
  update: (id: string, teacher: string | null) =>
    fetchAPI<Assignment>(`/api/assignments/${id}`, {
      method: "PUT",
      body: JSON.stringify({ teacher }),
    }),
  batchUpdate: (assignments: { classId: string; subject: string; teacherId: string | null }[]) =>
    fetchAPI<Assignment[]>("/api/assignments/batch", {
      method: "PUT",
      body: JSON.stringify({ assignments }),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/api/assignments/${id}`, { method: "DELETE" }),
  autoAssign: () =>
    fetchAPI<{ created: number; total: number; assignments: Assignment[] }>("/api/assignments/auto-assign", {
      method: "POST",
    }),
  clearAll: () =>
    fetchAPI<{ message: string }>("/api/assignments/clear-all", {
      method: "POST",
    }),
};

// ============ TIME GRID ============
export const timeGrid = {
  get: () => fetchAPI<TimeGridConfig>("/api/time-grid"),
  update: (data: TimeGridConfig) =>
    fetchAPI<TimeGridConfig>("/api/time-grid", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ============ TIMETABLE ============
export const timetable = {
  generate: (rules: { id: string; enabled: boolean }[]) =>
    fetchAPI<GenerationResult>("/api/timetable/generate", {
      method: "POST",
      body: JSON.stringify({ rules }),
    }),
  getByClass: (classId: string) => fetchAPI<TimetableEntry[]>(`/api/timetable/${classId}`),
  getByTeacher: (teacherId: string) => fetchAPI<TimetableEntry[]>(`/api/timetable/teacher/${teacherId}`),
  getLatest: () => fetchAPI<{
    generationId: string | null;
    entries: TimetableEntryData[];
    classes: { id: string; name: string }[];
    subjects: { id: string; name: string; color: string }[];
    teachers: { id: string; name: string }[];
    maxPeriods: number;
    breaks: { afterPeriod: number; name: string; duration: number }[];
    staticCourses: { classId: string; day: number; period: number; name: string; color: string }[];
  }>("/api/timetable/latest"),

  // PDF Export
  downloadPDF: async (type: 'class' | 'teacher', id: string, language: string = 'zh') => {
    const response = await fetch(`${API_BASE}/api/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, language })
    });
    
    if (!response.ok) throw new Error("Failed to generate PDF");
    return response.blob();
  },
};

// ============ EXCEL IMPORT/EXPORT ============
export const excel = {
  // Template downloads - returns download URL
  downloadSubjectsTemplate: () => "/api/excel/template/subjects",
  downloadTeachersTemplate: () => "/api/excel/template/teachers",
  downloadRoomsTemplate: () => "/api/excel/template/rooms",
  
  // Import data
  importSubjects: (data: string[][]) =>
    fetchAPI<{ success: Subject[]; errors: { row: number; error: string }[] }>("/api/excel/import/subjects", {
      method: "POST",
      body: JSON.stringify({ data }),
    }),
  importTeachers: (data: string[][]) =>
    fetchAPI<{ success: Teacher[]; errors: { row: number; error: string }[] }>("/api/excel/import/teachers", {
      method: "POST",
      body: JSON.stringify({ data }),
    }),
  importRooms: (data: string[][]) =>
    fetchAPI<{ success: Room[]; errors: { row: number; error: string }[] }>("/api/excel/import/rooms", {
      method: "POST",
      body: JSON.stringify({ data }),
    }),


};

// ============ TIMETABLE GENERATION (MiniZinc) ============
export interface GenerationEstimate {
  estimatedTimeMs: number;
  problemSize: {
    classes: number;
    teachers: number;
    subjects: number;
    periods: number;
    days: number;
    totalSlots: number;
  };
}

export interface GenerationResult {
  success: boolean;
  generationId: string;
  output?: {
    status: string;
    timetable: {
      classIndex: number;
      subjectIndex: number;
      teacherIndex: number;
      roomIndex: number;
      day: number;
      period: number;
      isDoublePeriod: boolean;
    }[];
    statistics: {
      solveTimeMs: number;
      nodes: number;
      solutions: number;
      failures: number;
      restarts: number;
      score: number;
    };
    conflicts: { id: string; type: string; message: string }[];
    totalPeriods: number;
    successRate: number;
    unscheduledPeriods: number;
  };
  error?: string;
  estimatedTimeMs?: number;
}

export interface GenerationFlags {
  MAX_TEACHER_CONSECUTIVE_PERIODS?: number;
  TEACHER_DAILY_LOAD_BALANCE?: boolean;
  PE_CLASS_AFTER_RECESS?: boolean;
  NO_CONSECUTIVE_SAME_SUBJECT?: boolean;
  NO_HARD_SUBJECTS_AFTER_LUNCH?: boolean;
  HARD_SUBJECTS_IN_MORNING?: boolean;
  ALLOW_DOUBLE_PERIODS?: boolean;
  LAB_REQUIRES_DOUBLE_PERIOD?: boolean;
  RESPECT_ROOM_CAPACITY?: boolean;
  LAB_SUBJECTS_NEED_LAB_ROOM?: boolean;
}

export const generation = {
  getEstimate: () => fetchAPI<GenerationEstimate>("/api/generation/estimate"),
  generate: (options?: { flags?: GenerationFlags; timeoutMs?: number }) =>
    fetchAPI<GenerationResult>("/api/generation/generate", {
      method: "POST",
      body: JSON.stringify(options || {}),
    }),
  getInput: () => fetchAPI<Record<string, unknown>>("/api/generation/input"),
};

// ============ TIMETABLE ENTRIES ============
export interface TimetableEntryData {
  id: string;
  generation_id: string;
  class_id: string;
  subject_id: string | null;
  teacher_id: string | null;
  day: number;
  period: number;
  is_free: boolean;
  static_name?: string;  // For static courses (固定课程)
  expand?: {
    class_id?: { id: string; name: string };
    subject_id?: { id: string; name: string; color?: string };
    teacher_id?: { id: string; name: string };
  };
}

// ============ TYPES ============
// Re-export types from frontend types for convenience
export interface Subject {
  id: string;
  created?: string;
  updated?: string;
  name: string;
  shortName: string;
  color: string;
  requiresLab: boolean;
}

export interface Teacher {
  id: string;
  created?: string;
  updated?: string;
  name: string;
  subject: string;
  weeklyLoad: number;
  unavailable: number[][];
  expand?: {
    subject?: Subject;
  };
}

export interface Room {
  id: string;
  created?: string;
  updated?: string;
  name: string;
  tags: string[];
}

export interface SubjectAllocation {
  id: string;
  subjectId: string;
  totalPeriods: number;
  doublePeriods: number;
  singlePeriods: number;
  requiresLab: boolean;
}

export interface StaticCourse {
  id: string;
  name: string;
  day: number;
  period: number;
  color: string;
}

export interface Discipline {
  id: string;
  created?: string;
  updated?: string;
  name: string;
  category: string;
  subjectAllocations: SubjectAllocation[];
  staticCourses: StaticCourse[];
}

export interface ClassRecord {
  id: string;
  created?: string;
  updated?: string;
  name: string;
  category: string;
  discipline: string;
  formTeacher: string | null;
  expand?: {
    discipline?: Discipline;
    formTeacher?: Teacher;
  };
}

export interface Assignment {
  id: string;
  created?: string;
  updated?: string;
  class: string;
  subject: string;
  teacher: string | null;
  expand?: {
    class?: ClassRecord;
    subject?: Subject;
    teacher?: Teacher;
  };
}

export interface TimeGridConfig {
  id?: string;
  workDays: number;
  periodsPerDay: number;
  breaks: {
    id: string;
    name: string;
    duration: number;
    isHard: boolean;
    afterPeriod: number;
  }[];
  daySchedules?: Record<number, { period: number; startTime: string; endTime: string }[]>; // Deprecated
  selectedDays: number[];
  schoolStartDate: string;
  schoolStartTime: string;
  minutesPerPeriod: number;
}

export interface GenerationResult {
  status?: string;
  successRate?: number;
  totalPeriods?: number;
  conflicts?: { id: string; message: string; severity: "error" | "warning" }[];
  message?: string;
}

export interface TimetableEntry {
  id: string;
  class: string;
  day: number;
  period: number;
  subject: string;
  teacher: string;
  room?: string;
}
