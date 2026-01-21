import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Plus, X, Coffee, Utensils, Loader2, Calendar, Clock } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { Break } from '@/types/time-grid'
import type { StepProps } from '@/types/common'
import { timeGrid as timeGridApi } from '@/lib/api'

const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function TimeGridSetup({ onNext }: StepProps) {
  // Loading states
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Config state
  const [workDays, setWorkDays] = useState(5)
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]) // Mon-Fri by default
  const [periodsPerDay, setPeriodsPerDay] = useState(8)
  const [schoolStartDate, setSchoolStartDate] = useState('2026-09-01')
  const [schoolStartTime, setSchoolStartTime] = useState('08:00')
  const [minutesPerPeriod, setMinutesPerPeriod] = useState(45)
  const [breaks, setBreaks] = useState<Break[]>([
    { id: '1', name: '大课间', duration: 20, isHard: true, afterPeriod: 2 },
    { id: '2', name: '午餐', duration: 60, isHard: true, afterPeriod: 4 },
  ])
  
  const [showBreakForm, setShowBreakForm] = useState(false)
  const [newBreak, setNewBreak] = useState({ name: '', duration: 10, isHard: false, afterPeriod: 1 })

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await timeGridApi.get()
        if (data) {
          setWorkDays(data.workDays || 5)
          setPeriodsPerDay(data.periodsPerDay || 8)
          setBreaks(data.breaks || [])
          // Load new fields if they exist
          if (data.selectedDays) setSelectedDays(data.selectedDays)
          if (data.schoolStartDate) setSchoolStartDate(data.schoolStartDate)
          if (data.schoolStartTime) setSchoolStartTime(data.schoolStartTime)
          if (data.minutesPerPeriod) setMinutesPerPeriod(data.minutesPerPeriod)
        }
      } catch (err) {
        console.error('Failed to load time grid:', err)
        // Use defaults on error
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Save to backend
  const saveConfig = async () => {
    try {
      setSaving(true)
      await timeGridApi.update({
        workDays,
        periodsPerDay,
        breaks,
        selectedDays,
        schoolStartDate,
        schoolStartTime,
        minutesPerPeriod,
      })
      return true
    } catch (err) {
      console.error('Failed to save time grid:', err)
      setError('Failed to save. Please try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    const success = await saveConfig()
    if (success && onNext) {
      onNext()
    }
  }

  // Update selected days when workDays changes
  const handleWorkDaysChange = (days: number) => {
    setWorkDays(days)
    // Auto-select first N days if current selection doesn't match
    if (selectedDays.length !== days) {
      setSelectedDays(Array.from({ length: days }, (_, i) => i))
    }
  }

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      if (selectedDays.length > 1) { // Keep at least one day
        setSelectedDays(selectedDays.filter(d => d !== dayIndex))
        setWorkDays(selectedDays.length - 1)
      }
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort())
      setWorkDays(selectedDays.length + 1)
    }
  }

  const addBreak = async () => {
    if (newBreak.name && newBreak.afterPeriod > 0 && newBreak.afterPeriod <= periodsPerDay) {
      const updatedBreaks = [...breaks, { ...newBreak, id: Date.now().toString() }]
      setBreaks(updatedBreaks)
      setNewBreak({ name: '', duration: 10, isHard: false, afterPeriod: 1 })
      setShowBreakForm(false)
    }
  }

  const removeBreak = (id: string) => {
    setBreaks(breaks.filter(b => b.id !== id))
  }

  const getBreakAfterPeriod = (period: number) => {
    return breaks.find(b => b.afterPeriod === period)
  }

  // Calculate period times dynamically
  const calculatePeriodTime = (periodIndex: number): { start: string; end: string } => {
    const [startHour, startMinute] = schoolStartTime.split(':').map(Number)
    let currentMinutes = startHour * 60 + startMinute

    for (let i = 0; i < periodIndex; i++) {
      currentMinutes += minutesPerPeriod
      const breakAfter = getBreakAfterPeriod(i + 1)
      if (breakAfter) {
        currentMinutes += breakAfter.duration
      }
    }

    const startTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`
    const endMinutes = currentMinutes + minutesPerPeriod
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

    return { start: startTime, end: endTime }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading time grid configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">第一步：规划学校时间</h1>
        <p className="text-gray-600">定义全校课表的时间框架，这将作为所有班级排课的基础画布</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Parameters */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">基础参数</h3>
            
            <div className="space-y-6">
              {/* Work Days & Periods in same row */}
              <div>
                <div>
                  <Label htmlFor="periodsPerDay" className="text-gray-700 mb-2 block">每日最大课节数</Label>
                  <Input
                    id="periodsPerDay"
                    type="number"
                    min="2"
                    max="15"
                    value={periodsPerDay}
                    onChange={(e) => setPeriodsPerDay(Math.min(15, Math.max(2, parseInt(e.target.value) || 2)))}
                    className="bg-[#F9FAFB] border-gray-200"
                  />
                </div>
              </div>

              {/* Day Selection */}
              <div>
                <Label className="text-gray-700 mb-3 block">选择上课日</Label>
                <div className="grid grid-cols-4 gap-2">
                  {WEEKDAY_NAMES.map((day, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedDays.includes(index)
                          ? 'bg-purple-50 border-primary'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleDay(index)}
                    >
                      <Checkbox
                        checked={selectedDays.includes(index)}
                        onCheckedChange={() => toggleDay(index)}
                      />
                      <span className="text-sm">{day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* School Start Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    开学日期
                  </Label>
                  <Input
                    type="date"
                    value={schoolStartDate}
                    onChange={(e) => setSchoolStartDate(e.target.value)}
                    className="bg-[#F9FAFB] border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 mb-2 block flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    第一节开始
                  </Label>
                  <Input
                    type="time"
                    value={schoolStartTime}
                    onChange={(e) => setSchoolStartTime(e.target.value)}
                    className="bg-[#F9FAFB] border-gray-200"
                  />
                </div>
              </div>

              {/* Minutes Per Period */}
              <div>
                <Label className="text-gray-700 mb-2 block">每节课时长（分钟）</Label>
                <Input
                  type="number"
                  min="20"
                  max="90"
                  value={minutesPerPeriod}
                  onChange={(e) => setMinutesPerPeriod(Math.min(90, Math.max(20, parseInt(e.target.value) || 45)))}
                  className="bg-[#F9FAFB] border-gray-200"
                />
              </div>
            </div>
          </Card>

          {/* Break Definition Card */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">时间块定义</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBreakForm(!showBreakForm)}
                className="text-primary border-primary hover:bg-purple-50"
              >
                <Plus className="w-4 h-4 mr-1" />
                添加
              </Button>
            </div>

            {/* Existing Breaks */}
            <div className="space-y-2 mb-4">
              {breaks.map((breakItem) => (
                <div key={breakItem.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    {breakItem.name.includes('午') ? (
                      <Utensils className="w-4 h-4 text-primary" />
                    ) : (
                      <Coffee className="w-4 h-4 text-primary" />
                    )}
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{breakItem.name}</div>
                      <div className="text-xs text-gray-600">
                        第{breakItem.afterPeriod}节后 · {breakItem.duration}分钟
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeBreak(breakItem.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Break Form */}
            {showBreakForm && (
              <Card className="p-4 bg-gray-50 border border-gray-200">
                <div className="space-y-3 ">
                  <Label className="text-gray-700 mb-2 block">名称</Label>
                  <Input
                    placeholder="名称（如：大课间、午餐）"
                    value={newBreak.name}
                    onChange={(e) => setNewBreak({ ...newBreak, name: e.target.value })}
                    className="bg-white"
                  />
                  <Label className="text-gray-700 mb-2 block">时长（分钟）</Label>
                  <div className="grid">
                    <Input
                      type="number"
                      placeholder="时长"
                      min="5"
                      max="120"
                      value={newBreak.duration}
                      onChange={(e) => setNewBreak({ ...newBreak, duration: parseInt(e.target.value) })}
                      className="bg-white"
                    />
					</div>
					<Label className="text-gray-700 mb-2 block">第几节后</Label>
					<div className="grid">
                    <Input
                      type="number"
                      placeholder="第几节后"
                      min="1"
                      max={periodsPerDay}
                      value={newBreak.afterPeriod}
                      onChange={(e) => setNewBreak({ ...newBreak, afterPeriod: parseInt(e.target.value) })}
                      className="bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isHard"
                      checked={newBreak.isHard}
                      onCheckedChange={(checked) => setNewBreak({ ...newBreak, isHard: checked })}
                    />
                    <Label htmlFor="isHard" className="text-sm cursor-pointer">
                      硬性断点
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowBreakForm(false)} className="flex-1">
                      取消
                    </Button>
                    <Button size="sm" onClick={addBreak} className="flex-1 bg-primary hover:bg-purple-700">
                      添加
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                已检测到 <strong>{breaks.filter(b => b.isHard).length}</strong> 个硬性断点
              </p>
            </div>
          </Card>
        </div>

        {/* Right Side - 2D Grid Preview */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">交互式预览时间表</h3>
            
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Header */}
                <div className="flex gap-1 mb-1">
                  <div className="w-24 flex-shrink-0"></div>
                  {selectedDays.map((dayIndex) => (
                    <div key={dayIndex} className="flex-1 min-w-[100px] text-center font-semibold text-gray-700 py-2">
                      {WEEKDAY_NAMES[dayIndex]}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="space-y-1">
                  {Array.from({ length: periodsPerDay }, (_, periodIndex) => {
                    const period = periodIndex + 1
                    const breakAfter = getBreakAfterPeriod(period)
                    const { start, end } = calculatePeriodTime(periodIndex)
                    
                    return (
                      <div key={period}>
                        {/* Period Row */}
                        <div className="flex gap-1">
                          <div className="w-24 flex-shrink-0 flex flex-col items-center justify-center bg-gray-100 rounded text-sm font-medium text-gray-700 py-1">
                            <span>第{period}节</span>
                            <span className="text-xs text-gray-500">{start}-{end}</span>
                          </div>
                          {selectedDays.map((dayIndex) => (
                            <div
                              key={dayIndex}
                              className="flex-1 min-w-[100px] p-2 bg-gradient-to-br from-purple-50 to-purple-100 rounded border border-purple-200 hover:border-primary transition-colors"
                            >
                              <div className="text-xs text-gray-600 text-center">
                                {start} - {end}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Break Row */}
                        {breakAfter && (
                          <div className="flex gap-1 my-2">
                            <div className={`w-24 flex-shrink-0 flex items-center justify-center rounded text-xs font-medium ${
                              breakAfter.isHard ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {breakAfter.isHard ? '🚫' : '☕'}
                            </div>
                            {selectedDays.map((dayIndex) => (
                              <div
                                key={dayIndex}
                                className={`flex-1 min-w-[100px] p-2 rounded border-2 border-dashed ${
                                  breakAfter.isHard
                                    ? 'bg-orange-50 border-orange-300'
                                    : 'bg-green-50 border-green-300'
                                }`}
                              >
                                <div className="text-xs font-medium text-gray-900 text-center">
                                  {breakAfter.name}
                                </div>
                                <div className="text-xs text-gray-600 text-center">
                                  {breakAfter.duration}分钟
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-gray-900 mb-2">时间框架总结</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">工作日：</span>
                  <span className="ml-2 font-medium text-gray-900">{workDays} 天/周</span>
                </div>
                <div>
                  <span className="text-gray-600">每日课节：</span>
                  <span className="ml-2 font-medium text-gray-900">{periodsPerDay} 节</span>
                </div>
                <div>
                  <span className="text-gray-600">总课时：</span>
                  <span className="ml-2 font-medium text-gray-900">{workDays * periodsPerDay} 节/周</span>
                </div>
                <div>
                  <span className="text-gray-600">课时长度：</span>
                  <span className="ml-2 font-medium text-gray-900">{minutesPerPeriod} 分钟</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" disabled className="text-gray-400">
          上一步
        </Button>
        <Button 
          className="bg-primary hover:bg-purple-700" 
          onClick={handleNext}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            '保存并前往下一步'
          )}
        </Button>
      </div>
    </div>
  )
}
