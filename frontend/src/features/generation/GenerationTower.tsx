import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Play, RotateCcw, AlertTriangle, AlertCircle, CheckCircle2, Zap, Plus, Info, Clock, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OptimizationRule, GenerationResult } from '@/types/generation'
import type { StepProps } from '@/types/common'
import { generation } from '@/lib/api'
import type { GenerationResult as APIGenerationResult, GenerationEstimate } from '@/lib/api'
import { useTranslation } from 'react-i18next'

const presetRules: OptimizationRule[] = [
  { id: '1', labelKey: 'generation.rule1_label', descriptionKey: 'generation.rule1_desc', enabled: true, type: 'preset' },
  { id: '2', labelKey: 'generation.rule2_label', descriptionKey: 'generation.rule2_desc', enabled: true, type: 'preset' },
  { id: '3', labelKey: 'generation.rule3_label', descriptionKey: 'generation.rule3_desc', enabled: true, type: 'preset' },
  { id: '4', labelKey: 'generation.rule4_label', descriptionKey: 'generation.rule4_desc', enabled: true, type: 'preset' },
]

export function GenerationTower({ onNext, onBack }: StepProps) {
  const { t } = useTranslation()
  const [rules, setRules] = useState<OptimizationRule[]>(presetRules)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [problemSize, setProblemSize] = useState<GenerationEstimate['problemSize'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleRule = (ruleId: string) => {
    setRules(rules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ))
  }

  // Fetch estimate on mount
  useEffect(() => {
    const fetchEstimate = async () => {
      try {
        const estimate = await generation.getEstimate()
        setEstimatedTime(estimate.estimatedTimeMs)
        setProblemSize(estimate.problemSize)
      } catch (err) {
        console.error('Failed to fetch estimate:', err)
      }
    }
    fetchEstimate()
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

    try {
      // Map rules to flags - match new rule IDs
      const flags = {
        NO_CONSECUTIVE_SAME_SUBJECT: rules.find(r => r.id === '1')?.enabled,          // 同一科目不在同一天连续出现
        MAX_TEACHER_CONSECUTIVE_PERIODS: rules.find(r => r.id === '2')?.enabled ? 3 : 10, // 避免教师连续授课3个班级以上
        DOUBLE_PERIOD_NO_RECESS: rules.find(r => r.id === '3')?.enabled,              // 双节不可跨过课间时间
        MINIMIZE_TEACHER_GAPS: rules.find(r => r.id === '4')?.enabled,                // 减少教师在校时间
      }

      const response: APIGenerationResult = await generation.generate({ 
        flags,
        timeoutMs: 120000 // 2 minute timeout
      })

      setIsGenerating(false)
      setGenerationComplete(true)

      if (response.success && response.output) {
        setResult({
          successRate: response.output.successRate,
          totalPeriods: response.output.totalPeriods,
          conflicts: response.output.conflicts.map((c, idx) => ({
            id: String(idx),
            message: c.message,
            severity: c.type === 'error' ? 'error' as const : 'warning' as const,
          })),
        })
      } else {
        setError(response.error || 'Generation failed')
        setResult({
          successRate: 0,
          totalPeriods: 0,
          conflicts: [{
            id: '1',
            message: response.error || 'Unknown error occurred',
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
          message: `生成失败: ${errorMsg}`,
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">{t('generation.step_title_6')}</h1>
        <p className="text-gray-600">{t('generation.step_desc_6')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Rules Configuration */}
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
              <h3 className="text-lg font-semibold text-gray-900">排课引擎</h3>
            </div>

            {!isGenerating && !generationComplete && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <Zap className="w-12 h-12 text-primary" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">准备就绪</h4>
                <p className="text-gray-600 mb-6">已配置 {enabledRulesCount} 条优化规则，点击开始生成课表</p>
                <Button onClick={startGeneration} size="lg" className="bg-primary hover:bg-purple-700">
                  <Play className="w-5 h-5 mr-2" />
                  开始生成
                </Button>
              </div>
            )}

            {isGenerating && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">正在生成课表...</h4>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">已用时: {formatTime(elapsedTime)}</span>
                  {estimatedTime && (
                    <span className="text-gray-400">/ 预计 ~{formatTime(estimatedTime)}</span>
                  )}
                </div>
                {problemSize && (
                  <p className="text-sm text-gray-500">
                    {problemSize.classes}班级 × {problemSize.subjects}科目 × {problemSize.days}天 × {problemSize.periods}节
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-2">正在应用 {enabledRulesCount} 条优化规则</p>
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
                          ? '生成成功！'
                          : '生成完成，但存在问题'}
                      </h4>
                      <p className="text-gray-600">
                        成功率 {result.successRate}% · 共 {result.totalPeriods} 节课
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="p-4 bg-gray-50 border border-gray-200 text-center">
                    <div className="text-3xl font-bold text-primary">{result.successRate}%</div>
                    <div className="text-sm text-gray-600">成功率</div>
                  </Card>
                  <Card className="p-4 bg-gray-50 border border-gray-200 text-center">
                    <div className="text-3xl font-bold text-gray-900">{result.totalPeriods}</div>
                    <div className="text-sm text-gray-600">总节数</div>
                  </Card>
                  <Card className="p-4 bg-gray-50 border border-gray-200 text-center">
                    <div className="text-3xl font-bold text-orange-600">{result.conflicts.length}</div>
                    <div className="text-sm text-gray-600">待处理</div>
                  </Card>
                </div>

                {/* Conflicts List */}
                {result.conflicts.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">冲突详情</h4>
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
                  <Button onClick={regenerate} variant="outline" className="text-primary border-primary hover:bg-purple-50">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    重新生成
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <Button
          className="bg-primary hover:bg-purple-700"
          onClick={onNext}
          disabled={!generationComplete}
        >
          查看课表，下一步
        </Button>
      </div>
    </div>
  )
}
