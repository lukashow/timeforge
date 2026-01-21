export const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1) as readonly number[]

export const PERIOD_TIMES = [
  '08:00-08:45',
  '08:50-09:35',
  '09:45-10:30',
  '10:35-11:20',
  '13:30-14:15',
  '14:20-15:05',
  '15:15-16:00',
  '16:05-16:50',
] as const

export const DEFAULT_PERIODS_PER_DAY = 8
export const DEFAULT_WORK_DAYS = 5
