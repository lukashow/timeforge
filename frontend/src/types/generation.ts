export interface OptimizationRule {
  id: string
  label: string
  description: string
  enabled: boolean
  type: 'preset' | 'custom'
  condition?: string
  action?: string
}

export interface Conflict {
  id: string
  message: string
  severity: 'error' | 'warning'
}

export interface GenerationResult {
  successRate: number
  totalPeriods: number
  conflicts: Conflict[]
}
