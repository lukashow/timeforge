import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Loader2, RotateCcw, BookOpen } from 'lucide-react'
import { subjects as subjectsApi, disciplines as disciplinesApi, timeGrid as timeGridApi } from '@/lib/api'
import type { Subject, Discipline as ApiDiscipline, SubjectAllocation, StaticCourse } from '@/lib/api'
import { WEEKDAYS } from '@/constants/weekdays'

interface LocalDiscipline {
  id: string
  name: string
  category: string
  subjectAllocations: SubjectAllocation[]
  staticCourses: StaticCourse[]
}

export function DisciplinesPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [disciplines, setDisciplines] = useState<LocalDiscipline[]>([])
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('')
  const [maxPeriodsPerWeek, setMaxPeriodsPerWeek] = useState<number>(40)
  
  // Dialog states
  const [showNewForm, setShowNewForm] = useState(false)
  const [newDisciplineName, setNewDisciplineName] = useState('')
  const [newDisciplineCategory, setNewDisciplineCategory] = useState('高中部')
  const [deleteConfirm, setDeleteConfirm] = useState<LocalDiscipline | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  
  // Static course dialog
  const [showStaticCourseForm, setShowStaticCourseForm] = useState(false)
  const [newStaticCourse, setNewStaticCourse] = useState({ name: '', day: 0, period: 1, color: '#FCD34D' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [subjectsData, disciplinesData] = await Promise.all([
        subjectsApi.getAll(),
        disciplinesApi.getAll(),
      ])
      setSubjects(subjectsData)
      const transformedDisciplines: LocalDiscipline[] = disciplinesData.map((d: ApiDiscipline) => ({
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
      try {
        const grid: any = await timeGridApi.get()
        const periodsPerDay = grid?.periodsPerDay ?? 8
        const workDays = grid?.workDays ?? 5
        setMaxPeriodsPerWeek(periodsPerDay * workDays)
      } catch {
        console.warn('Failed to load time grid, using default')
      }
    } catch (err) {
      setError(t('curriculum.error_load'))
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentDiscipline = () => disciplines.find(d => d.id === selectedDiscipline)

  const getTotalPeriods = (discipline: LocalDiscipline) => {
    const subjectPeriods = discipline.subjectAllocations.reduce((sum, alloc) => sum + alloc.totalPeriods, 0)
    const staticPeriods = discipline.staticCourses?.length || 0
    return subjectPeriods + staticPeriods
  }

  const getSubjectById = (id: string) => subjects.find(s => s.id === id)

  const addDiscipline = async () => {
    if (newDisciplineName.trim()) {
      try {
        const created = await disciplinesApi.create({
          name: newDisciplineName,
          category: newDisciplineCategory,
          subjectAllocations: [],
          staticCourses: [],
        })
        const newDiscipline: LocalDiscipline = {
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
        setShowNewForm(false)
      } catch (err) {
        console.error('Failed to create discipline:', err)
      }
    }
  }

  const deleteDiscipline = async (discipline: LocalDiscipline) => {
    try {
      await disciplinesApi.delete(discipline.id)
      const remaining = disciplines.filter(d => d.id !== discipline.id)
      setDisciplines(remaining)
      if (selectedDiscipline === discipline.id && remaining.length > 0) {
        setSelectedDiscipline(remaining[0].id)
      }
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete discipline:', err)
    }
  }

  // Clear all assignments for current discipline
  const clearAssignments = async () => {
    const discipline = getCurrentDiscipline()
    if (!discipline) return
    try {
      await disciplinesApi.update(discipline.id, {
        subjectAllocations: [],
        staticCourses: [],
      })
      setDisciplines(disciplines.map(d => 
        d.id === discipline.id ? { ...d, subjectAllocations: [], staticCourses: [] } : d
      ))
      setShowClearConfirm(false)
    } catch (err) {
      console.error('Failed to clear assignments:', err)
    }
  }

  const addSubjectAllocation = async () => {
    const discipline = getCurrentDiscipline()
    if (!discipline || subjects.length === 0) return
    
    const usedSubjectIds = discipline.subjectAllocations.map(a => a.subjectId)
    const availableSubject = subjects.find(s => !usedSubjectIds.includes(s.id))
    if (!availableSubject) return
    
    // Use the subject's requiresLab from database, default periods based on typical allocation
    const newAllocation: SubjectAllocation = {
      id: crypto.randomUUID(),
      subjectId: availableSubject.id,
      totalPeriods: 2, // Start with minimal, user will adjust
      doublePeriods: 0,
      singlePeriods: 2,
      requiresLab: availableSubject.requiresLab, // Use value from subject database
    }
    
    const updatedAllocations = [...discipline.subjectAllocations, newAllocation]
    try {
      await disciplinesApi.update(discipline.id, { subjectAllocations: updatedAllocations })
      setDisciplines(disciplines.map(d => 
        d.id === discipline.id ? { ...d, subjectAllocations: updatedAllocations } : d
      ))
    } catch (err) {
      console.error('Failed to add allocation:', err)
    }
  }

  const updateAllocation = async (allocId: string, field: string, value: number | string | boolean) => {
    const discipline = getCurrentDiscipline()
    if (!discipline) return
    
    const updatedAllocations = discipline.subjectAllocations.map(a => {
      if (a.id !== allocId) return a
      
      let updated = { ...a, [field]: value }
      
      // Auto-sync period fields
      if (field === 'totalPeriods' && typeof value === 'number') {
        // When totalPeriods changes, adjust singlePeriods to match (keep doublePeriods)
        updated.singlePeriods = Math.max(0, value - (updated.doublePeriods * 2))
      } else if (field === 'doublePeriods' && typeof value === 'number') {
        // When doublePeriods changes, recalculate totalPeriods
        updated.totalPeriods = (value * 2) + updated.singlePeriods
      } else if (field === 'singlePeriods' && typeof value === 'number') {
        // When singlePeriods changes, recalculate totalPeriods
        updated.totalPeriods = (updated.doublePeriods * 2) + value
      } else if (field === 'subjectId' && typeof value === 'string') {
        // When subject changes, update requiresLab from the new subject
        const newSubject = subjects.find(s => s.id === value)
        if (newSubject) {
          updated.requiresLab = newSubject.requiresLab
        }
      }
      
      return updated
    })
    
    try {
      await disciplinesApi.update(discipline.id, { subjectAllocations: updatedAllocations })
      setDisciplines(disciplines.map(d => 
        d.id === discipline.id ? { ...d, subjectAllocations: updatedAllocations } : d
      ))
    } catch (err) {
      console.error('Failed to update allocation:', err)
    }
  }

  const removeAllocation = async (allocId: string) => {
    const discipline = getCurrentDiscipline()
    if (!discipline) return
    
    const updatedAllocations = discipline.subjectAllocations.filter(a => a.id !== allocId)
    try {
      await disciplinesApi.update(discipline.id, { subjectAllocations: updatedAllocations })
      setDisciplines(disciplines.map(d => 
        d.id === discipline.id ? { ...d, subjectAllocations: updatedAllocations } : d
      ))
    } catch (err) {
      console.error('Failed to remove allocation:', err)
    }
  }

  const addStaticCourse = async () => {
    const discipline = getCurrentDiscipline()
    if (!discipline) return
    
    const newCourse: StaticCourse = {
      id: crypto.randomUUID(),
      ...newStaticCourse,
    }
    const updatedCourses = [...(discipline.staticCourses || []), newCourse]
    try {
      await disciplinesApi.update(discipline.id, { staticCourses: updatedCourses })
      setDisciplines(disciplines.map(d => 
        d.id === discipline.id ? { ...d, staticCourses: updatedCourses } : d
      ))
      setShowStaticCourseForm(false)
    } catch (err) {
      console.error('Failed to add static course:', err)
    }
  }

  const removeStaticCourse = async (courseId: string) => {
    const discipline = getCurrentDiscipline()
    if (!discipline) return
    
    const updatedCourses = discipline.staticCourses?.filter(c => c.id !== courseId) || []
    try {
      await disciplinesApi.update(discipline.id, { staticCourses: updatedCourses })
      setDisciplines(disciplines.map(d => 
        d.id === discipline.id ? { ...d, staticCourses: updatedCourses } : d
      ))
    } catch (err) {
      console.error('Failed to remove static course:', err)
    }
  }

  const currentDiscipline = getCurrentDiscipline()
  const totalPeriods = currentDiscipline ? getTotalPeriods(currentDiscipline) : 0
  const isOverLimit = totalPeriods > maxPeriodsPerWeek

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('resources.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadData}>{t('common.retry')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('pages.disciplines', '学科组管理')}</h1>
          <p className="text-muted-foreground mt-1">{t('pages.disciplines_desc', '管理学科组和课程配置')}</p>
        </div>
        <div className="flex gap-2">
          {currentDiscipline && currentDiscipline.subjectAllocations.length > 0 && (
            <Button variant="outline" className="text-destructive" onClick={() => setShowClearConfirm(true)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('pages.clear_assignments', '清空配置')}
            </Button>
          )}
          <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowNewForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('curriculum.add_discipline', '新增学科组')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('curriculum.add_discipline_new', '创建新学科组')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>{t('curriculum.discipline_name', '学科组名称')}</Label>
                  <Input
                    placeholder={t('curriculum.discipline_placeholder', '例如: 高一理科')}
                    value={newDisciplineName}
                    onChange={(e) => setNewDisciplineName(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>{t('curriculum.category', '所属类别')}</Label>
                  <Select value={newDisciplineCategory} onValueChange={setNewDisciplineCategory}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="高中部">{t('curriculum.high_school', '高中部')}</SelectItem>
                      <SelectItem value="初中部">{t('curriculum.middle_school', '初中部')}</SelectItem>
                      <SelectItem value="小学部">{t('curriculum.elementary', '小学部')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowNewForm(false)}>{t('common.cancel')}</Button>
                <Button onClick={addDiscipline}>{t('common.add')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Discipline Selector with Actions */}
      <div className="flex gap-2 flex-wrap items-center">
        {disciplines.map((d) => (
          <div key={d.id} className="flex items-center gap-1">
            <Button
              variant={selectedDiscipline === d.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDiscipline(d.id)}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {d.name}
              <Badge variant="secondary" className="ml-1">{d.category}</Badge>
            </Button>
            {selectedDiscipline === d.id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteConfirm(d)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">{disciplines.length}</div>
          <div className="text-sm text-muted-foreground">{t('pages.total_disciplines', '学科组总数')}</div>
        </Card>
        <Card className={`p-4 ${isOverLimit ? 'border-destructive' : ''}`}>
          <div className={`text-2xl font-bold ${isOverLimit ? 'text-destructive' : 'text-foreground'}`}>
            {totalPeriods} / {maxPeriodsPerWeek}
          </div>
          <div className="text-sm text-muted-foreground">{t('curriculum.total_periods', '总课时')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">
            {currentDiscipline?.subjectAllocations.length || 0}
          </div>
          <div className="text-sm text-muted-foreground">{t('pages.allocated_subjects', '已分配科目')}</div>
        </Card>
      </div>

      {currentDiscipline ? (
        <>
          {/* Subject Allocations - Single Column Layout */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{t('curriculum.subject_allocation', '科目课时分配')}</h3>
              <Button size="sm" onClick={addSubjectAllocation} disabled={currentDiscipline.subjectAllocations.length >= subjects.length}>
                <Plus className="w-4 h-4 mr-2" />
                {t('curriculum.add_subject', '添加科目')}
              </Button>
            </div>
            
            <div className="space-y-3">
              {currentDiscipline.subjectAllocations.map((alloc) => {
                const subject = getSubjectById(alloc.subjectId)
                return (
                  <div key={alloc.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    {/* Subject */}
                    <div className="w-40">
                      <Select
                        value={alloc.subjectId}
                        onValueChange={(value) => updateAllocation(alloc.id, 'subjectId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Total Periods */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">{t('curriculum.total_weekly_periods', '周课时')}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="15"
                        value={alloc.totalPeriods}
                        onChange={(e) => updateAllocation(alloc.id, 'totalPeriods', parseInt(e.target.value) || 1)}
                        className="w-16"
                      />
                    </div>
                    
                    {/* Double Periods */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">{t('curriculum.double_periods', '连堂')}</Label>
                      <Input
                        type="number"
                        min="0"
                        max={Math.floor(alloc.totalPeriods / 2)}
                        value={alloc.doublePeriods}
                        onChange={(e) => updateAllocation(alloc.id, 'doublePeriods', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                    
                    {/* Single Periods - Auto calculated, disabled */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap text-muted-foreground">{t('curriculum.single_periods', '单节')}</Label>
                      <Input
                        type="number"
                        value={alloc.singlePeriods}
                        disabled
                        className="w-16 bg-muted"
                      />
                    </div>
                    
                    {/* Calculation Display */}
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {alloc.doublePeriods}×2 + {alloc.singlePeriods}×1 = {alloc.doublePeriods * 2 + alloc.singlePeriods}
                      {alloc.doublePeriods * 2 + alloc.singlePeriods !== alloc.totalPeriods && (
                        <span className="text-destructive ml-1">!</span>
                      )}
                    </div>
                    
                    {/* Color Indicator */}
                    {subject && (
                      <div 
                        className="w-6 h-6 rounded-md flex-shrink-0"
                        style={{ backgroundColor: subject.color }}
                      />
                    )}
                    
                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 ml-auto"
                      onClick={() => removeAllocation(alloc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })}
              
              {currentDiscipline.subjectAllocations.length === 0 && (
                <p className="text-muted-foreground text-center py-8">{t('curriculum.no_allocations', '暂无分配，点击添加科目开始')}</p>
              )}
            </div>
          </Card>

          {/* Static Courses */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{t('curriculum.static_courses', '固定课程')}</h3>
              <Dialog open={showStaticCourseForm} onOpenChange={setShowStaticCourseForm}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => setShowStaticCourseForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('curriculum.add_static', '添加固定课程')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('curriculum.add_static_course', '添加固定课程')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>{t('curriculum.course_name', '课程名称')}</Label>
                      <Input
                        value={newStaticCourse.name}
                        placeholder={t('curriculum.course_name_placeholder')}
                        onChange={(e) => setNewStaticCourse({ ...newStaticCourse, name: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('curriculum.day', '星期')}</Label>
                        <Select
                          value={String(newStaticCourse.day)}
                          onValueChange={(v) => setNewStaticCourse({ ...newStaticCourse, day: parseInt(v) })}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKDAYS.slice(0, 5).map((day, i) => (
                              <SelectItem key={i} value={String(i)}>{t(`weekdays.${day}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('curriculum.period', '节次')}</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={newStaticCourse.period}
                          onChange={(e) => setNewStaticCourse({ ...newStaticCourse, period: parseInt(e.target.value) })}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{t('curriculum.color', '颜色')}</Label>
                      <Input
                        type="color"
                        value={newStaticCourse.color}
                        onChange={(e) => setNewStaticCourse({ ...newStaticCourse, color: e.target.value })}
                        className="mt-2 h-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowStaticCourseForm(false)}>{t('common.cancel')}</Button>
                    <Button onClick={addStaticCourse}>{t('common.add')}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-2">
              {currentDiscipline.staticCourses?.map((course) => (
                <div key={course.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <div 
                    className="w-6 h-6 rounded-md flex-shrink-0"
                    style={{ backgroundColor: course.color }}
                  />
                  <span className="font-medium">{course.name}</span>
                  <Badge variant="secondary">{t(`weekdays.${WEEKDAYS[course.day]}`)} {t('curriculum.period_num', '第{{period}}节', { period: course.period })}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 ml-auto"
                    onClick={() => removeStaticCourse(course.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {(!currentDiscipline.staticCourses || currentDiscipline.staticCourses.length === 0) && (
                <p className="text-muted-foreground text-center py-4">{t('curriculum.no_static', '暂无固定课程')}</p>
              )}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('curriculum.select_discipline', '请选择或创建一个学科组')}</p>
        </Card>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('curriculum.confirm_delete', '确认删除')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">{t('curriculum.delete_msg', { name: deleteConfirm?.name })}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteDiscipline(deleteConfirm)}>
              {t('common.confirm_delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pages.clear_confirm_title', '确认清空配置')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">{t('pages.clear_confirm_msg', '此操作将清空当前学科组的所有科目分配和固定课程。此操作不可撤销。')}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={clearAssignments}>
              {t('pages.confirm_clear', '确认清空')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
