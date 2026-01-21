export interface Subject {
  id: string
  name: string
  shortName: string
  color: string
  requiresLab: boolean
}

export interface Teacher {
  id: string
  name: string
  subjectId: string
  weeklyLoad: number
  unavailable: number[][]
}

export interface Room {
  id: string
  name: string
  tags: string[]
}
