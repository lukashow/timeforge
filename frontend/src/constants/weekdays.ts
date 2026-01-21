export const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

export const WEEKDAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export type Weekday = typeof WEEKDAYS[number]
export type WeekdayEN = typeof WEEKDAYS_EN[number]
