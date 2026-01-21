export interface Break {
  id: string
  name: string
  duration: number
  isHard: boolean
  afterPeriod: number
}

export interface PeriodTime {
  period: number
  startTime: string
  endTime: string
}

export interface DaySchedule {
  [key: number]: PeriodTime[]
}

export interface TimeGridConfig {
  workDays: number
  periodsPerDay: number
  breaks: Break[]
  daySchedules: DaySchedule
}
