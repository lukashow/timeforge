export interface AssignmentTeacher {
  id: string
  name: string
  subject: string
  currentLoad: number
  maxLoad: number
}

export interface Assignment {
  classId: string
  subject: string
  teacherId: string | null
}

export interface GradeClasses {
  [grade: string]: string[]
}
