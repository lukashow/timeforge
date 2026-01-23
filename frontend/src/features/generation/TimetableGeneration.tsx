import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Play, RotateCcw, AlertTriangle, AlertCircle, CheckCircle2, Zap, Plus, Info, Clock, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OptimizationRule, GenerationResult } from '@/types/generation'
import type { StepProps } from '@/types/common'
import { generation, timetable } from '@/lib/api'
import type { GenerationResult as APIGenerationResult, GenerationEstimate } from '@/lib/api'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const presetRules: OptimizationRule[] = [
  { id: '1', labelKey: 'generation.rule1_label', descriptionKey: 'generation.rule1_desc', enabled: true, type: 'preset' },
  { id: '2', labelKey: 'generation.rule2_label', descriptionKey: 'generation.rule2_desc', enabled: true, type: 'preset' },
  { id: '3', labelKey: 'generation.rule3_label', descriptionKey: 'generation.rule3_desc', enabled: true, type: 'preset' },
  { id: '4', labelKey: 'generation.rule4_label', descriptionKey: 'generation.rule4_desc', enabled: true, type: 'preset' },
]

export function TimetableGeneration({ onNext, onBack }: StepProps) {
  const { t } = useTranslation()
  const [rules, setRules] = useState<OptimizationRule[]>(presetRules)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [problemSize, setProblemSize] = useState<GenerationEstimate['problemSize'] | null>(null)
  const [, setError] = useState<string | null>(null)
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false)
  const [hasExistingTimetables, setHasExistingTimetables] = useState(false)

  const toggleRule = (ruleId: string) => {
    setRules(rules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ))
  }

  // Fetch estimate and check existing timetables on mount
  useEffect(() => {
    const initData = async () => {
      // Fetch estimate
      try {
        const estimate = await generation.getEstimate()
        setEstimatedTime(estimate.estimatedTimeMs)
        setProblemSize(estimate.problemSize)
      } catch (err) {
        console.error('Failed to fetch estimate:', err)
      }

      // Check existing timetables
      try {
        const latest = await timetable.getLatest()
        console.log('Latest timetable check:', latest)
        
        if (latest && latest.entries && latest.entries.length > 0) {
          console.log('Found existing timetables')
          setHasExistingTimetables(true)
        }
      } catch (err) {
        console.error('Failed to check existing timetables:', err)
      }
    }
    initData()
  }, [])

  // Elapsed time counter during generation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (isGenerating) {
      setElapsedTime(0)
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1000)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isGenerating])

  const startGeneration = async () => {
    setIsGenerating(true)
    setGenerationComplete(false)
    setResult(null)
    setError(null)
    setElapsedTime(0)
    // Reset hasExistingTimetables as we are generating new ones
    setHasExistingTimetables(false)

    try {
      // Map rules to flags - match new rule IDs
      const flags = {
        NO_CONSECUTIVE_SAME_SUBJECT: rules.find(r => r.id === '1')?.enabled,
        MAX_TEACHER_CONSECUTIVE_PERIODS: rules.find(r => r.id === '2')?.enabled ? 3 : 10,
        DOUBLE_PERIOD_NO_RECESS: rules.find(r => r.id === '3')?.enabled,
        MINIMIZE_TEACHER_GAPS: rules.find(r => r.id === '4')?.enabled,
      }

      const response: APIGenerationResult = await generation.generate({ 
        flags,
        timeoutMs: 120000 
      })

      setIsGenerating(false)
      setGenerationComplete(true)

      if (response.success && response.output) {
        setResult({
          successRate: response.output.successRate,
          totalPeriods: response.output.totalPeriods,
          solveTimeMs: response.output.statistics.solveTimeMs,
          score: response.output.statistics.score,
          status: response.output.status,
          conflicts: response.output.conflicts.map((c, idx) => ({
            id: String(idx),
            message: c.message,
            severity: c.type === 'error' ? 'error' as const : 'warning' as const,
          })),
        })
      } else {
        setError(response.error || t('generation.error_generic'))
        setResult({
          successRate: 0,
          totalPeriods: 0,
          conflicts: [{
            id: '1',
            message: response.error || t('generation.error_unknown'),
            severity: 'error',
          }],
        })
      }
    } catch (err) {
      setIsGenerating(false)
      setGenerationComplete(true)
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      setResult({
        successRate: 0,
        totalPeriods: 0,
        conflicts: [{
          id: '1',
          message: t('generation.error_failed_with_msg', { error: errorMsg }),
          severity: 'error',
        }],
      })
    }
  }

  const regenerate = () => {
    setGenerationComplete(false)
    setResult(null)
    startGeneration()
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return t('generation.seconds', { count: seconds })
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return t('generation.minutes_seconds', { minutes, seconds: remainingSeconds })
  }

  const enabledRulesCount = rules.filter(r => r.enabled).length

  const handleStartGenerationClick = () => {
    if (hasExistingTimetables) {
      setShowOverwriteWarning(true)
    } else {
      startGeneration()
    }
  }

  const handleRegenerateClick = () => {
    setShowOverwriteWarning(true)
  }

  return (
    <div className="p-8">
      <Dialog open={showOverwriteWarning} onOpenChange={setShowOverwriteWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600 gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('generation.overwrite_title')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="bg-red-50 text-red-900 p-4 rounded-md border border-red-200 mb-2">
                {t('generation.overwrite_desc')}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverwriteWarning(false)}>
              {t('generation.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => {
              setShowOverwriteWarning(false)
              regenerate()
            }}>
              {t('generation.confirm_overwrite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">{t('generation.step_title_6')}</h1>
        <p className="text-gray-600">{t('generation.step_desc_6')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{t('generation.rules_title')}</h3>
              <Badge variant="secondary" className="bg-purple-50 text-primary">
                {t('generation.enabled_count', { enabled: enabledRulesCount, total: rules.length })}
              </Badge>
            </div>

            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-lg border transition-all ${
                    rule.enabled
                      ? 'bg-purple-50 border-primary'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{t((rule as any).labelKey)}</div>
                      <div className="text-xs text-gray-600 mt-1">{t((rule as any).descriptionKey)}</div>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 text-primary border-primary hover:bg-purple-50"
              disabled={isGenerating}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('generation.add_custom_rule')}
            </Button>
          </Card>
        </div>

        {/* Center - Generation Engine */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-gray-900">{t('generation.engine_title')}</h3>
            </div>

            {!isGenerating && !generationComplete && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <Zap className="w-12 h-12 text-primary" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">{t('generation.ready')}</h4>
                <p className="text-gray-600 mb-6">{t('generation.ready_desc', { count: enabledRulesCount })}</p>
                <Button onClick={handleStartGenerationClick} size="lg" className="bg-primary hover:bg-purple-700">
                  <Play className="w-5 h-5 mr-2" />
                  {t('generation.start_btn')}
                </Button>
              </div>
            )}

            {isGenerating && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">{t('generation.generating')}</h4>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">{t('generation.elapsed_time')} {formatTime(elapsedTime)}</span>
                  {estimatedTime && (
                    <span className="text-gray-400">{t('generation.estimated_time')} {formatTime(estimatedTime)}</span>
                  )}
                </div>
                {problemSize && (
                  <p className="text-sm text-gray-500">
                    {t('generation.problem_size', { classes: problemSize.classes, subjects: problemSize.subjects, days: problemSize.days, periods: problemSize.periods })}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-2">{t('generation.applying_rules', { count: enabledRulesCount })}</p>
              </div>
            )}

            {generationComplete && result && (
              <div>
                {/* Success/Failure Header */}
                <div className={`p-6 rounded-lg mb-6 ${
                  result.conflicts.filter(c => c.severity === 'error').length === 0
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-orange-50 border border-orange-200'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      result.conflicts.filter(c => c.severity === 'error').length === 0
                        ? 'bg-green-100'
                        : 'bg-orange-100'
                    }`}>
                      {result.conflicts.filter(c => c.severity === 'error').length === 0 ? (
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-8 h-8 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">
                        {result.conflicts.filter(c => c.severity === 'error').length === 0
                          ? t('generation.success_title')
                          : t('generation.success_with_issues_title')}
                      </h4>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {/* Status Badge */}
                        <Badge variant="outline" className={`
                          capitalize
                          ${result.status === 'optimal' || result.status === 'satisfied' 
                            ? 'border-green-500 text-green-700 bg-green-50' 
                            : 'border-orange-500 text-orange-700 bg-orange-50'}
                        `}>
                          {t('generation.status')}: {result.status || 'Unknown'}
                        </Badge>
                        
                        {/* Time Badge */}
                        {result.solveTimeMs && (
                          <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">
                            <Clock className="w-3 h-3 mr-1" />
                            {t('generation.time')}: {(result.solveTimeMs / 1000).toFixed(2)}s
                          </Badge>
                        )}

                        {/* Efficiency/Score Badge (lower gaps is better) */}
                        {result.score !== undefined && (
                          <Badge variant="outline" className="border-purple-500 text-purple-700 bg-purple-50">
                            <Zap className="w-3 h-3 mr-1" />
                            {t('generation.optimization_score')}: {result.score} (Gaps)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conflict List (if any) */}
                {result.conflicts.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-4">{t('generation.conflicts_details')}</h4>
                    <div className="space-y-3">
                      {result.conflicts.map((conflict) => (
                        <div
                          key={conflict.id}
                          className={`p-4 rounded-lg border flex items-start gap-3 ${
                            conflict.severity === 'error'
                              ? 'bg-red-50 border-red-200'
                              : 'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          {conflict.severity === 'error' ? (
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className={`font-medium ${
                              conflict.severity === 'error' ? 'text-red-900' : 'text-yellow-900'
                            }`}>
                              {conflict.message}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`${
                              conflict.severity === 'error'
                                ? 'text-red-600 hover:bg-red-100'
                                : 'text-yellow-600 hover:bg-yellow-100'
                            }`}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regenerate Button */}
                <div className="mt-6 flex justify-center">
                  <Button onClick={handleRegenerateClick} variant="outline" className="text-primary border-primary hover:bg-purple-50">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t('generation.regenerate')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          {t('common.prev_step')}
        </Button>
        <Button
          className="bg-primary hover:bg-purple-700"
          onClick={onNext}
          disabled={!generationComplete}
        >
          {t('generation.view_timetable_next')}
        </Button>
      </div>
    </div>
  )
}
