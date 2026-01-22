import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, AlertCircle, CheckCircle2, BookOpen, Calendar, Clock, Loader2, Edit2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import type { SubjectAllocation, Discipline } from '@/types/curriculum'
import type { StepProps } from '@/types/common'
import { WEEKDAYS } from '@/constants/weekdays'
import { subjects as subjectsApi, disciplines as disciplinesApi, timeGrid as timeGridApi } from '@/lib/api'
import type { Subject, Discipline as ApiDiscipline } from '@/lib/api'

export function CurriculumDesign({ onNext, onBack }: StepProps) {
  const { t } = useTranslation()
  // Loading states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data from API
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])

  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('')
  const [newDisciplineName, setNewDisciplineName] = useState('')
  const [newDisciplineCategory, setNewDisciplineCategory] = useState('高中部')
  const [showNewDisciplineForm, setShowNewDisciplineForm] = useState(false)
  const [showStaticCourseForm, setShowStaticCourseForm] = useState(false)
  const [newStaticCourse, setNewStaticCourse] = useState({ name: '周会', day: 0, period: 1, color: '#FCD34D' })
  const [deleteConfirmDiscipline, setDeleteConfirmDiscipline] = useState<Discipline | null>(null)
  const [editDiscipline, setEditDiscipline] = useState<Discipline | null>(null)

  const [maxPeriodsPerWeek, setMaxPeriodsPerWeek] = useState<number>(40)

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [subjectsData, disciplinesData] = await Promise.all([
          subjectsApi.getAll(),
          disciplinesApi.getAll(),
        ])
        setSubjects(subjectsData)
        // Transform API disciplines to local format
        const transformedDisciplines: Discipline[] = disciplinesData.map((d: ApiDiscipline) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          subjectAllocations: d.subjectAllocations || [],
          staticCourses: d.staticCourses || [],
        }))
        setDisciplines(transformedDisciplines)
        if (transformedDisciplines.length > 0) {
          setSelectedDiscipline(transformedDisciplines[0].id)
        }
        // Fetch time grid configuration to compute max periods per week
        try {
          const grid: any = await timeGridApi.get()
          const periodsPerDay = grid?.periodsPerDay ?? (Array.isArray(grid?.periods) ? grid.periods.length : undefined) ?? 8
          const workDays = grid?.workDays ?? (Array.isArray(grid?.selectedDays) ? grid.selectedDays.length : undefined) ?? 5
          setMaxPeriodsPerWeek(periodsPerDay * workDays)
        } catch (err) {
          // Keep default
          console.warn('Failed to load time grid, using default max periods per week', err)
        }
      } catch (err) {
        setError(t('curriculum.error_load'))
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getCurrentDiscipline = () => disciplines.find(d => d.id === selectedDiscipline)

  const getTotalPeriods = (discipline: Discipline) => {
    const subjectPeriods = discipline.subjectAllocations.reduce((sum, alloc) => sum + alloc.totalPeriods, 0)
    const staticCoursePeriods = discipline.staticCourses?.length || 0 // Each static course counts as 1 period
    return subjectPeriods + staticCoursePeriods
  }

  const addDiscipline = async () => {
    if (newDisciplineName.trim()) {
      try {
        const created = await disciplinesApi.create({
          name: newDisciplineName,
          category: newDisciplineCategory,
          subjectAllocations: [],
          staticCourses: [],
        })
        const newDiscipline: Discipline = {
          id: created.id,
          name: created.name,
          category: created.category,
          subjectAllocations: created.subjectAllocations || [],
          staticCourses: created.staticCourses || [],
        }
        setDisciplines([...disciplines, newDiscipline])
        setSelectedDiscipline(newDiscipline.id)
        setNewDisciplineName('')
        setNewDisciplineCategory('高中部')
        setShowNewDisciplineForm(false)
      } catch (err) {
        console.error('Failed to create discipline:', err)
      }
    }
  }

  const updateDiscipline = async () => {
    if (!editDiscipline) return
    try {
      const updated = await disciplinesApi.update(editDiscipline.id, {
        name: editDiscipline.name,
        category: editDiscipline.category,
      })
      setDisciplines(disciplines.map(d => 
        d.id === editDiscipline.id 
          ? { ...d, name: updated.name, category: updated.category }
          : d
      ))
      setEditDiscipline(null)
    } catch (err) {
      console.error('Failed to update discipline:', err)
    }
  }

  const deleteDiscipline = async (discipline: Discipline) => {
    try {
      await disciplinesApi.delete(discipline.id)
      const remaining = disciplines.filter(d => d.id !== discipline.id)
      setDisciplines(remaining)
      if (selectedDiscipline === discipline.id && remaining.length > 0) {
        setSelectedDiscipline(remaining[0].id)
      }
      setDeleteConfirmDiscipline(null)
    } catch (err) {
      console.error('Failed to delete discipline:', err)
    }
  }

  const addSubjectAllocation = async () => {
    const discipline = getCurrentDiscipline()
    if (discipline && subjects.length > 0) {
      const newAllocation: SubjectAllocation = {
        id: Date.now().toString(),
        subjectId: subjects[0].id,
        totalPeriods: 5,
        doublePeriods: 0,
        singlePeriods: 5,
        requiresLab: false,
      }
      const updatedAllocations = [...discipline.subjectAllocations, newAllocation]
      try {
        await disciplinesApi.update(discipline.id, { 
          subjectAllocations: updatedAllocations 
        })
        setDisciplines(disciplines.map(d =>
          d.id === selectedDiscipline
            ? { ...d, subjectAllocations: updatedAllocations }
            : d
        ))
      } catch (err) {
        console.error('Failed to add subject allocation:', err)
      }
    }
  }

  const updateAllocation = async (allocId: string, field: keyof SubjectAllocation, value: number | string | boolean) => {
    const discipline = getCurrentDiscipline()
    if (!discipline) return

    const updatedAllocations = discipline.subjectAllocations.map(alloc => {
      if (alloc.id === allocId) {
        const updated = { ...alloc, [field]: value }
        if (field === 'totalPeriods' || field === 'doublePeriods') {
          const doubles = field === 'doublePeriods' ? value as number : alloc.doublePeriods
          const total = field === 'totalPeriods' ? value as number : alloc.totalPeriods
          updated.singlePeriods = Math.max(0, total - doubles * 2)
        }
        return updated
      }
      return alloc
    })

    try {
      await disciplinesApi.update(discipline.id, { 
        subjectAllocations: updatedAllocations 
      })
      setDisciplines(disciplines.map(d =>
        d.id === selectedDiscipline
          ? { ...d, subjectAllocations: updatedAllocations }
          : d
      ))
    } catch (err) {
      console.error('Failed to update allocation:', err)
    }
  }

  const removeAllocation = async (allocId: string) => {
    const discipline = getCurrentDiscipline()
    if (!discipline) return

    const updatedAllocations = discipline.subjectAllocations.filter(alloc => alloc.id !== allocId)
    try {
      await disciplinesApi.update(discipline.id, { 
        subjectAllocations: updatedAllocations 
      })
      setDisciplines(disciplines.map(d =>
        d.id === selectedDiscipline
          ? { ...d, subjectAllocations: updatedAllocations }
          : d
      ))
    } catch (err) {
      console.error('Failed to remove allocation:', err)
    }
  }

  const addStaticCourse = async () => {
    const discipline = getCurrentDiscipline()
    if (!discipline || !newStaticCourse.name) return

    const newCourse = { ...newStaticCourse, id: Date.now().toString() }
    const updatedCourses = [...discipline.staticCourses, newCourse]
    
    try {
      await disciplinesApi.update(discipline.id, { 
        staticCourses: updatedCourses 
      })
      setDisciplines(disciplines.map(d =>
        d.id === selectedDiscipline
          ? { ...d, staticCourses: updatedCourses }
          : d
      ))
      setNewStaticCourse({ name: '周会', day: 0, period: 1, color: '#FCD34D' })
      setShowStaticCourseForm(false)
    } catch (err) {
      console.error('Failed to add static course:', err)
    }
  }

  const removeStaticCourse = async (courseId: string) => {
    const discipline = getCurrentDiscipline()
    if (!discipline) return

    const updatedCourses = discipline.staticCourses.filter(c => c.id !== courseId)
    try {
      await disciplinesApi.update(discipline.id, { 
        staticCourses: updatedCourses 
      })
      setDisciplines(disciplines.map(d =>
        d.id === selectedDiscipline
          ? { ...d, staticCourses: updatedCourses }
          : d
      ))
    } catch (err) {
      console.error('Failed to remove static course:', err)
    }
  }

  const getSubjectById = (id: string) => subjects.find(s => s.id === id)

  const currentDiscipline = getCurrentDiscipline()
  const totalPeriods = currentDiscipline ? getTotalPeriods(currentDiscipline) : 0
  const isOverCapacity = totalPeriods > maxPeriodsPerWeek

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">{t('curriculum.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>{t('common.retry')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">{t('curriculum.step_title_3')}</h1>
        <p className="text-gray-600">{t('curriculum.step_desc_3')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side - Disciplines List */}
        <div className="lg:col-span-1">
          <Card className="p-4 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{t('curriculum.discipline_list')}</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowNewDisciplineForm(!showNewDisciplineForm)}
                className="h-8 w-8 p-0 text-primary hover:bg-purple-50"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {showNewDisciplineForm && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
                <Input
                  placeholder={t('curriculum.discipline_name_placeholder')}
                  value={newDisciplineName}
                  onChange={(e) => setNewDisciplineName(e.target.value)}
                  className="bg-white"
                />
                <Select value={newDisciplineCategory} onValueChange={setNewDisciplineCategory}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={t('curriculum.select_section_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="高中部">{t('curriculum.section_high')}</SelectItem>
                    <SelectItem value="初中部">{t('curriculum.section_middle')}</SelectItem>
                    <SelectItem value="小学部">{t('curriculum.section_primary')}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowNewDisciplineForm(false)} className="flex-1">
                    {t('common.cancel')}
                  </Button>
                  <Button size="sm" onClick={addDiscipline} className="flex-1 bg-primary hover:bg-purple-700">
                    {t('common.add')}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {disciplines.map((discipline) => {
                const total = getTotalPeriods(discipline)
                const isSelected = selectedDiscipline === discipline.id
                const hasIssue = total > maxPeriodsPerWeek

                return (
                  <div
                    key={discipline.id}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-start justify-between ${
                      isSelected
                        ? 'bg-purple-50 border-primary'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedDiscipline(discipline.id)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-gray-900 mb-1">{discipline.name}</div>
                      <div className="text-xs text-gray-600 mb-2">{discipline.category}</div>
                      <div className="flex items-center gap-2">
                        <div className={`text-xs ${hasIssue ? 'text-red-600' : 'text-gray-600'}`}>
                          {total} {t('curriculum.periods_per_week')} {discipline.staticCourses?.length > 0 && `(${t('common.includes')} ${discipline.staticCourses.length} ${t('curriculum.static_courses')})`}
                        </div>
                        {hasIssue && <AlertCircle className="w-3 h-3 text-red-500" />}
                      </div>
                    </button>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { 
                          e.stopPropagation()
                          setEditDiscipline({ ...discipline })
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-primary"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { 
                          e.stopPropagation()
                          setDeleteConfirmDiscipline(discipline)
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Center - Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{currentDiscipline?.name}</h3>
                <p className="text-sm text-gray-600">{t('curriculum.allocation_config')}</p>
              </div>
              <Button size="sm" onClick={addSubjectAllocation} className="bg-primary hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                {t('curriculum.add_subject')}
              </Button>
            </div>

            <div className="space-y-4">
              {currentDiscipline?.subjectAllocations.map((alloc) => {
                const subject = getSubjectById(alloc.subjectId)
                return (
                  <Card key={alloc.id} className="p-4 bg-gray-50 border border-gray-200">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {subject && (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white text-xs"
                              style={{ backgroundColor: subject.color }}
                            >
                              {subject.shortName}
                            </div>
                          )}
                          <Select
                            value={alloc.subjectId}
                            onValueChange={(value) => updateAllocation(alloc.id, 'subjectId', value)}
                          >
                            <SelectTrigger className="bg-white flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeAllocation(alloc.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">{t('curriculum.total_weekly_periods')}</Label>
                          <Input
                            type="number"
                            min="1"
                            max="15"
                            value={alloc.totalPeriods}
                            onChange={(e) => updateAllocation(alloc.id, 'totalPeriods', parseInt(e.target.value))}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">{t('curriculum.double_periods')}</Label>
                          <Input
                            type="number"
                            min="0"
                            max={Math.floor(alloc.totalPeriods / 2)}
                            value={alloc.doublePeriods}
                            onChange={(e) => updateAllocation(alloc.id, 'doublePeriods', parseInt(e.target.value))}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">{t('curriculum.single_periods')}</Label>
                          <Input
                            type="number"
                            value={alloc.singlePeriods}
                            disabled
                            className="bg-gray-100 text-gray-600"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-600">
                          {t('common.calculation')}: {alloc.doublePeriods} × 2 + {alloc.singlePeriods} × 1 = {alloc.doublePeriods * 2 + alloc.singlePeriods} {t('curriculum.period_suffix')}
                          {alloc.doublePeriods * 2 + alloc.singlePeriods !== alloc.totalPeriods && (
                            <span className="text-red-600 ml-2">{t('curriculum.calc_mismatch')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={alloc.requiresLab}
                            onCheckedChange={(checked) => updateAllocation(alloc.id, 'requiresLab', checked)}
                          />
                          <Label className="text-xs cursor-pointer">{t('resources.requires_lab')}</Label>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}

              {currentDiscipline?.subjectAllocations.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t('curriculum.no_config')}</p>
                  <p className="text-sm">{t('curriculum.click_add_config')}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Static Courses */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900">{t('curriculum.static_courses')}</h3>
              </div>
              <Button
                size="sm"
                onClick={() => setShowStaticCourseForm(!showStaticCourseForm)}
                className="bg-primary hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('curriculum.add_static_course')}
              </Button>
            </div>

            {showStaticCourseForm && (
              <Card className="p-4 bg-gray-50 border border-gray-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">{t('curriculum.course_name')}</Label>
                    <Input
                      placeholder={t('curriculum.course_name_placeholder')}
                      value={newStaticCourse.name}
                      onChange={(e) => setNewStaticCourse({ ...newStaticCourse, name: e.target.value })}
                      className="bg-white mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">{t('curriculum.day')}</Label>
                      <Select
                        value={newStaticCourse.day.toString()}
                        onValueChange={(value) => setNewStaticCourse({ ...newStaticCourse, day: parseInt(value) })}
                      >
                        <SelectTrigger className="bg-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.slice(0, 5).map((_, index) => (
                            <SelectItem key={index} value={index.toString()}>{t(`weekdays.${['mon', 'tue', 'wed', 'thu', 'fri'][index]}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">{t('curriculum.period')}</Label>
                      <Select
                        value={newStaticCourse.period.toString()}
                        onValueChange={(value) => setNewStaticCourse({ ...newStaticCourse, period: parseInt(value) })}
                      >
                        <SelectTrigger className="bg-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 8 }, (_, i) => i + 1).map((p) => (
                            <SelectItem key={p} value={p.toString()}>{t('time_grid.period_label', { period: p })}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">{t('resources.label_color')}</Label>
                    <Input
                      type="color"
                      value={newStaticCourse.color}
                      onChange={(e) => setNewStaticCourse({ ...newStaticCourse, color: e.target.value })}
                      className="bg-white mt-1 h-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowStaticCourseForm(false)} className="flex-1">
                      {t('common.cancel')}
                    </Button>
                    <Button size="sm" onClick={addStaticCourse} className="flex-1 bg-primary hover:bg-purple-700">
                      {t('common.add')}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-2">
              {currentDiscipline?.staticCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                  style={{ backgroundColor: course.color + '20' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white text-xs"
                      style={{ backgroundColor: course.color }}
                    >
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{course.name}</div>
                      <div className="text-sm text-gray-600">
                        {t(`weekdays.${['mon', 'tue', 'wed', 'thu', 'fri'][course.day]}`)} {t('time_grid.period_label', { period: course.period })}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeStaticCourse(course.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {currentDiscipline?.staticCourses.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">{t('curriculum.no_static_courses')}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Side - Validator */}
        <div className="lg:col-span-1">
          <Card className="p-4 bg-white border border-gray-200 sticky top-4">
            <h3 className="font-semibold text-gray-900 mb-4">{t('curriculum.validator')}</h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t('curriculum.assigned_periods')}</span>
                  <span className={`font-semibold ${isOverCapacity ? 'text-red-600' : 'text-primary'}`}>
                    {totalPeriods}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t('curriculum.total_available_periods')}</span>
                  <span className="font-semibold text-gray-900">{maxPeriodsPerWeek}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isOverCapacity ? 'bg-red-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min((totalPeriods / maxPeriodsPerWeek) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${
                isOverCapacity
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-start gap-2">
                  {isOverCapacity ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-red-900 text-sm mb-1">{t('curriculum.warning_overload')}</div>
                        <div className="text-xs text-red-700">
                          {t('curriculum.warning_overload_desc', { count: totalPeriods - maxPeriodsPerWeek })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-green-900 text-sm mb-1">{t('curriculum.config_normal')}</div>
                        <div className="text-xs text-green-700">
                          {t('curriculum.config_normal_desc', { count: maxPeriodsPerWeek - totalPeriods })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('curriculum.subject_distribution')}</h4>
                <div className="space-y-2">
                  {currentDiscipline?.subjectAllocations.map((alloc) => {
                    const subject = getSubjectById(alloc.subjectId)
                    return (
                      <div key={alloc.id} className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600">{subject?.name}</span>
                          <span className="font-medium text-gray-900">{alloc.totalPeriods} {t('curriculum.period_suffix')}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex gap-2">
                          {alloc.doublePeriods > 0 && (
                            <Badge variant="outline" className="text-xs">{alloc.doublePeriods}{t('curriculum.unit_double')}</Badge>
                          )}
                          {alloc.singlePeriods > 0 && (
                            <Badge variant="outline" className="text-xs">{alloc.singlePeriods}{t('curriculum.unit_single')}</Badge>
                          )}
                          {alloc.requiresLab && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">{t('resources.requires_lab')}</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          {t('common.prev')}
        </Button>
        <Button className="bg-primary hover:bg-purple-700" onClick={onNext} disabled={isOverCapacity}>
          {t('curriculum.confirm_config_next')}
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmDiscipline} onOpenChange={() => setDeleteConfirmDiscipline(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('curriculum.confirm_delete_discipline')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              {t('curriculum.delete_discipline_msg', { name: deleteConfirmDiscipline?.name })}
            </p>
            <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
              {t('curriculum.delete_discipline_warning')}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirmDiscipline(null)}>{t('common.cancel')}</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmDiscipline && deleteDiscipline(deleteConfirmDiscipline)}
            >
              {t('common.confirm_delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Discipline Dialog */}
      <Dialog open={!!editDiscipline} onOpenChange={() => setEditDiscipline(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('curriculum.edit_discipline')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('curriculum.label_discipline_name')}</Label>
              <Input
                value={editDiscipline?.name || ''}
                onChange={(e) => setEditDiscipline(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>{t('curriculum.label_section')}</Label>
              <Select 
                value={editDiscipline?.category || '高中部'} 
                onValueChange={(val) => setEditDiscipline(prev => prev ? { ...prev, category: val } : null)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="高中部">{t('curriculum.section_high')}</SelectItem>
                  <SelectItem value="初中部">{t('curriculum.section_middle')}</SelectItem>
                  <SelectItem value="小学部">{t('curriculum.section_primary')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditDiscipline(null)}>取消</Button>
            <Button className="bg-primary hover:bg-purple-700" onClick={updateDiscipline}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
