export interface Class {
  id: string
  name: string
  category: string
  discipline: string
  formTeacher: string | null
  formTeacherReason?: string
}

export interface ClassTeacher {
  id: string
  name: string
  subject: string
  load: 'light' | 'medium' | 'heavy'
}
