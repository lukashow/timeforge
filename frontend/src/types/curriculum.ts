export interface SubjectAllocation {
  id: string
  subjectId: string
  totalPeriods: number
  doublePeriods: number
  singlePeriods: number
  requiresLab: boolean
}

export interface StaticCourse {
  id: string
  name: string
  day: number
  period: number
  color: string
}

export interface Discipline {
  id: string
  name: string
  category: string
  subjectAllocations: SubjectAllocation[]
  staticCourses: StaticCourse[]
}
