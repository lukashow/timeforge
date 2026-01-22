import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, User, Users, AlertTriangle, Wand2, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from 'react-i18next'
import type { StepProps } from '@/types/common'
import { disciplines as disciplinesApi, teachers as teachersApi, classes as classesApi } from '@/lib/api'
import type { Discipline, Teacher, ClassRecord } from '@/lib/api'

export function ClassCreation({ onNext, onBack }: StepProps) {
  const { t } = useTranslation()
  // Loading states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data from API
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<ClassRecord[]>([])

  // Form states
  const [prefix, setPrefix] = useState('高一')
  const [startNum, setStartNum] = useState(1)
  const [endNum, setEndNum] = useState(3)
  const [selectedDiscipline, setSelectedDiscipline] = useState('')
  const [allowMultipleClasses, setAllowMultipleClasses] = useState(false)

  const [showTeacherDialog, setShowTeacherDialog] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [disciplinesData, teachersData, classesData] = await Promise.all([
          disciplinesApi.getAll(),
          teachersApi.getAll(),
          classesApi.getAll(),
        ])
        setDisciplines(disciplinesData)
        setTeachers(teachersData)
        setClasses(classesData)
        if (disciplinesData.length > 0) {
          setSelectedDiscipline(disciplinesData[0].id)
        }
      } catch (err) {
        setError(t('class.error_load'))
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const generateClasses = async () => {
    if (startNum <= endNum && selectedDiscipline) {
      try {
        const disc = disciplines.find(d => d.id === selectedDiscipline)
        const created = await classesApi.createBulk(prefix, startNum, endNum, disc?.category || 'default', selectedDiscipline)
        setClasses([...classes, ...created])
        setStartNum(endNum + 1)
        setEndNum(endNum + 3)
      } catch (err) {
        console.error('Failed to create classes:', err)
      }
    }
  }

  const autoAssignTeachers = async () => {
    // Don't filter by weeklyLoad - it's not dynamically updated from assignments
    const availableTeachers = teachers
    const unassignedClasses = classes.filter(c => !c.formTeacher)
    
    if (unassignedClasses.length === 0 || availableTeachers.length === 0) return
    
    // Collect all assignments to make
    const assignments: { classId: string; teacherId: string }[] = []
    
    for (let i = 0; i < unassignedClasses.length; i++) {
      const cls = unassignedClasses[i]
      
      if (allowMultipleClasses) {
        // Round-robin through all teachers
        const teacherIndex = i % availableTeachers.length
        const teacher = availableTeachers[teacherIndex]
        assignments.push({ classId: cls.id, teacherId: teacher.id })
      } else {
        // Each teacher gets exactly one class
        if (i >= availableTeachers.length) break
        const teacher = availableTeachers[i]
        assignments.push({ classId: cls.id, teacherId: teacher.id })
      }
    }
    
    // Make all API calls
    const results = await Promise.allSettled(
      assignments.map(({ classId, teacherId }) => 
        classesApi.assignFormTeacher(classId, teacherId)
      )
    )
    
    // Update state once with all successful assignments
    const successfulAssignments = assignments.filter((_, i) => results[i].status === 'fulfilled')
    setClasses(prev => prev.map(c => {
      const assignment = successfulAssignments.find(a => a.classId === c.id)
      return assignment ? { ...c, formTeacher: assignment.teacherId } : c
    }))
  }

  const assignTeacher = async (classId: string, teacherId: string) => {
    try {
      await classesApi.assignFormTeacher(classId, teacherId)
      setClasses(classes.map(cls =>
        cls.id === classId ? { ...cls, formTeacher: teacherId } : cls
      ))
      setShowTeacherDialog(false)
      setSelectedClassId(null)
    } catch (err) {
      console.error('Failed to assign teacher:', err)
    }
  }

  const removeTeacher = async (classId: string) => {
    try {
      await classesApi.assignFormTeacher(classId, null)
      setClasses(classes.map(cls =>
        cls.id === classId ? { ...cls, formTeacher: null } : cls
      ))
    } catch (err) {
      console.error('Failed to remove teacher:', err)
    }
  }

  const removeClass = async (classId: string) => {
    try {
      await classesApi.delete(classId)
      setClasses(classes.filter(cls => cls.id !== classId))
    } catch (err) {
      console.error('Failed to remove class:', err)
    }
  }

  const getTeacherById = (id: string | null) => {
    if (!id) return null
    const cls = classes.find(c => c.formTeacher === id)
    if (cls?.expand?.formTeacher) return cls.expand.formTeacher
    return teachers.find(t => t.id === id)
  }


  const unassignedCount = classes.filter(c => !c.formTeacher).length
  const assignedCount = classes.length - unassignedCount
  const hasWarning = unassignedCount > teachers.filter(t => t.weeklyLoad < 25).length

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">{t('class.loading')}</p>
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
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">{t('class.step_title_4')}</h1>
        <p className="text-gray-600">{t('class.step_desc_4')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Class Generator */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('class.batch_title')}</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 mb-2 block">{t('class.label_prefix')}</Label>
                <Input
                  placeholder={t('class.placeholder_prefix')}
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="bg-[#F9FAFB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700 mb-2 block">{t('class.label_start')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={startNum}
                    onChange={(e) => setStartNum(parseInt(e.target.value))}
                    className="bg-[#F9FAFB]"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 mb-2 block">{t('class.label_end')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={endNum}
                    onChange={(e) => setEndNum(parseInt(e.target.value))}
                    className="bg-[#F9FAFB]"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-700 mb-2 block">{t('class.label_discipline')}</Label>
                <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                  <SelectTrigger className="bg-[#F9FAFB]">
                    <SelectValue placeholder={t('class.select_discipline_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map((disc) => (
                      <SelectItem key={disc.id} value={disc.id}>{disc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <Button onClick={generateClasses} className="w-full bg-primary hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                {t('class.generate', { count: Math.max(0, endNum - startNum + 1) })}
              </Button>
            </div>
          </Card>

          {/* Smart Assignment */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-gray-900">{t('class.smart_assign')}</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{t('class.smart_assign_desc')}</p>

            {hasWarning && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    {t('class.warning', { unassigned: unassignedCount, available: teachers.filter(t => t.weeklyLoad < 25).length })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                id="allowMultiple"
                checked={allowMultipleClasses}
                onCheckedChange={(checked) => setAllowMultipleClasses(!!checked)}
              />
              <Label htmlFor="allowMultiple" className="text-sm cursor-pointer">
                {t('class.allow_multiple')}
              </Label>
            </div>

            <Button
              onClick={autoAssignTeachers}
              variant="outline"
              className="w-full text-primary border-primary hover:bg-purple-50"
              disabled={unassignedCount === 0}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('class.auto_assign_btn')}
            </Button>
          </Card>

          {/* Stats */}
          <Card className="p-4 bg-white border border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600 mb-1">{t('class.total_classes')}</div>
                <div className="text-2xl font-semibold text-gray-900">{classes.length}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">{t('class.assigned_teachers')}</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold text-green-600">{assignedCount}</span>
                  <span className="text-gray-400">/ {classes.length}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side - Class List */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('class.class_list')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((cls) => {
                const teacher = getTeacherById(cls.formTeacher)
                
                return (
                  <Card key={cls.id} className="p-4 bg-gray-50 border border-gray-200 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{cls.name}</h4>
                        <div className="text-xs text-gray-600 mt-1">
                          {cls.category} · {cls.discipline}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeClass(cls.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="border-t border-gray-200 pt-3 mt-3">
                      {teacher ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                              {teacher.name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                              <div className="text-xs text-gray-500">{t('class.assigned')}</div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTeacher(cls.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Dialog open={showTeacherDialog && selectedClassId === cls.id} onOpenChange={(open) => {
                          setShowTeacherDialog(open)
                          if (!open) setSelectedClassId(null)
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-primary border-primary hover:bg-purple-50"
                              onClick={() => setSelectedClassId(cls.id)}
                            >
                              <User className="w-4 h-4 mr-2" />
                              {t('class.select_form_teacher')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t('class.select_form_teacher_title', { name: cls.name })}</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
                              {teachers.map((teacher) => {
                                const isAssigned = classes.some(c => c.formTeacher === teacher.id && c.id !== cls.id)
                                const loadPercentage = (teacher.weeklyLoad / 25) * 100
                                return (
                                  <button
                                    key={teacher.id}
                                    onClick={() => !isAssigned && assignTeacher(cls.id, teacher.id)}
                                    disabled={isAssigned}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                      isAssigned
                                        ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                        : 'bg-white border-gray-200 hover:border-primary hover:bg-purple-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                                        {teacher.name[0]}
                                      </div>
                                      <div className="text-left">
                                        <div className="font-medium text-gray-900">{teacher.name}</div>
                                        <div className="text-sm text-gray-600">{teacher.expand?.subject?.name || t('class.unknown_subject')}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        className={`text-xs ${
                                          loadPercentage < 60 ? 'bg-green-50 text-green-700 border-green-200' :
                                          loadPercentage < 85 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                          'bg-red-50 text-red-700 border-red-200'
                                        }`}
                                      >
                                        {loadPercentage < 60 ? t('class.load_easy') : loadPercentage < 85 ? t('class.load_normal') : t('class.load_full')}
                                      </Badge>
                                      {isAssigned && (
                                        <Badge variant="outline" className="text-xs">{t('class.assigned')}</Badge>
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </Card>
                )
              })}

              {classes.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t('class.no_classes')}</p>
                  <p className="text-sm">{t('class.use_left_form')}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          {t('common.prev')}
        </Button>
        <Button className="bg-primary hover:bg-purple-700" onClick={onNext}>
          {t('class.confirm_next')}
        </Button>
      </div>
    </div>
  )
}
