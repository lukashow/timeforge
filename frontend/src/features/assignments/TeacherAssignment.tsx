import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wand2, User, CheckCircle2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { StepProps } from '@/types/common'
import { subjects as subjectsApi, teachers as teachersApi, classes as classesApi, assignments as assignmentsApi, disciplines as disciplinesApi } from '@/lib/api'
import type { Subject, Teacher, ClassRecord, Assignment, Discipline } from '@/lib/api'
import { useTranslation } from 'react-i18next'

export function TeacherAssignment({ onNext, onBack }: StepProps) {
  const { t } = useTranslation()
  // Loading states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data from API
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])

  const [activeGrade, setActiveGrade] = useState('')
  const [selectedCell, setSelectedCell] = useState<{ classId: string; subjectId: string } | null>(null)
  const [showTeacherDialog, setShowTeacherDialog] = useState(false)

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [subjectsData, teachersData, classesData, assignmentsData, disciplinesData] = await Promise.all([
          subjectsApi.getAll(),
          teachersApi.getAll(),
          classesApi.getAll(),
          assignmentsApi.getAll(),
          disciplinesApi.getAll(),
        ])
        setSubjects(subjectsData)
        setTeachers(teachersData)
        setClasses(classesData)
        setAssignments(assignmentsData)
        setDisciplines(disciplinesData)
        // Set first grade as active
        if (classesData.length > 0) {
          const grades = [...new Set(classesData.map(c => c.category || 'default'))]
          setActiveGrade(grades[0] || '')
        }
      } catch (err) {
        setError('Failed to load data. Please check backend connection.')
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Get unique grades from classes
  const grades = [...new Set(classes.map(c => c.category || 'default'))]
  
  // Get classes for current grade
  const classesForGrade = classes.filter(c => (c.category || 'default') === activeGrade)

  const getTeacherForCell = (classId: string, subjectId: string) => {
    const assignment = assignments.find(a => a.class === classId && a.subject === subjectId)
    if (!assignment) return null
    if (assignment.expand?.teacher) return assignment.expand.teacher
    return teachers.find(t => t.id === assignment.teacher)
  }

  const getTeachersForSubject = (subjectId: string) => {
    return teachers.filter(t => t.subject === subjectId)
  }

  // Calculate teacher workload for sorting and coloring
  const getTeacherWorkload = (teacherId: string) => {
    const teacherAssignments = assignments.filter(a => a.teacher === teacherId)
    let totalPeriods = 0
    
    teacherAssignments.forEach(assignment => {
      const cls = classes.find(c => c.id === assignment.class)
      if (cls?.discipline) {
        const discipline = disciplines.find(d => d.id === cls.discipline)
        if (discipline?.subjectAllocations) {
          const alloc = discipline.subjectAllocations.find(a => a.subjectId === assignment.subject)
          totalPeriods += alloc?.totalPeriods || 0
        }
      }
    })
    
    // Fallback estimate if no allocation data
    if (totalPeriods === 0 && teacherAssignments.length > 0) {
      totalPeriods = teacherAssignments.length * 5
    }
    
    const maxLoad = 25
    const loadPercentage = (totalPeriods / maxLoad) * 100
    return { totalPeriods, maxLoad, loadPercentage, classCount: teacherAssignments.length }
  }

  // Get workload-based color (green to red)
  const getWorkloadColor = (loadPercentage: number) => {
    if (loadPercentage < 50) return 'bg-green-100 text-green-800 border-green-200'
    if (loadPercentage < 75) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (loadPercentage < 100) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const assignTeacher = async (teacherId: string) => {
    if (selectedCell) {
      try {
        // Check if assignment exists
        const existing = assignments.find(a => 
          a.class === selectedCell.classId && a.subject === selectedCell.subjectId
        )
        
        // Find the teacher object for the expand field
        const teacherObj = teachers.find(t => t.id === teacherId)
        
        if (existing) {
          await assignmentsApi.update(existing.id, teacherId)
          setAssignments(prev => prev.map(a => 
            a.id === existing.id 
              ? { ...a, teacher: teacherId, expand: { ...a.expand, teacher: teacherObj } } 
              : a
          ))
        } else {
          const created = await assignmentsApi.create({
            class: selectedCell.classId,
            subject: selectedCell.subjectId,
            teacher: teacherId,
          })
          // Add the teacher expand to the created assignment
          setAssignments(prev => [...prev, { ...created, expand: { ...created.expand, teacher: teacherObj } }])
        }
        
        setShowTeacherDialog(false)
        setSelectedCell(null)
      } catch (err) {
        console.error('Failed to assign teacher:', err)
      }
    }
  }

  const autoAssignAll = async () => {
    // Use batch auto-assign endpoint for much better performance
    try {
      const result = await assignmentsApi.autoAssign()
      setAssignments(result.assignments)
      console.log(`Auto-assigned ${result.created} new assignments (total: ${result.total})`)
    } catch (err) {
      console.error('Failed to auto-assign:', err)
    }
  }

  const getTotalAssignments = () => {
    const total = classes.length * subjects.length
    const assigned = assignments.length
    return { total, assigned, percentage: total > 0 ? Math.round((assigned / total) * 100) : 0 }
  }

  const stats = getTotalAssignments()

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">{t('assignments.loading')}</p>
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
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">{t('assignments.step_title_5')}</h1>
        <p className="text-gray-600">{t('assignments.step_desc_5')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side - Stats and Actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">{t('assignments.distribution_progress')}</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-gray-600">{t('assignments.assigned')}</span>
                  <span className="font-medium text-gray-900">{stats.assigned} / {stats.total}</span>
                </div>
                <Progress value={stats.percentage} className="h-2" />
              </div>

              <div className="text-center py-4">
                <div className="text-4xl font-bold text-primary">{stats.percentage}%</div>
                <div className="text-sm text-gray-600 mt-1">{t('assignments.completion_rate')}</div>
              </div>

              {stats.percentage === 100 ? (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">{t('assignments.all_assigned')}</span>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={autoAssignAll}
                  className="w-full bg-primary hover:bg-purple-700"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {t('assignments.auto_assign_btn')}
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">{t('assignments.teacher_load_status')}</h3>
            <p className="text-xs text-gray-500 mb-3">{t('assignments.load_sort_hint')}</p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {[...teachers]
                .map(t => ({ ...t, workload: getTeacherWorkload(t.id) }))
                .sort((a, b) => b.workload.loadPercentage - a.workload.loadPercentage)
                .map((teacher) => {
                  const { totalPeriods, maxLoad, loadPercentage, classCount } = teacher.workload
                  const loadStatus = loadPercentage < 60 ? 'light' : loadPercentage < 85 ? 'medium' : 'heavy'
                  
                  return (
                    <div key={teacher.id} className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-700">{teacher.name}</span>
                        <span className="text-gray-500">{t('assignments.load_stat', { current: totalPeriods, max: maxLoad, count: classCount })}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            loadStatus === 'light' ? 'bg-green-500' :
                            loadStatus === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(loadPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </Card>
        </div>

        {/* Right Side - Matrix */}
        <div className="lg:col-span-3">
          <Card className="p-6 bg-white border border-gray-200">
            <Tabs value={activeGrade} onValueChange={setActiveGrade}>
              <TabsList className="mb-6">
                {grades.map((grade) => (
                  <TabsTrigger key={grade} value={grade}>{grade}</TabsTrigger>
                ))}
              </TabsList>

              {grades.map((grade) => (
                <TabsContent key={grade} value={grade}>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-3 text-left text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200">
                            {t('assignments.class_subject')}
                          </th>
                          {subjects.map((subject) => (
                            <th key={subject.id} className="p-3 text-center text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200">
                              {subject.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {classesForGrade.map((cls) => (
                          <tr key={cls.id}>
                            <td className="p-3 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200">
                              {cls.name}
                            </td>
                            {subjects.map((subject) => {
                              const teacher = getTeacherForCell(cls.id, subject.id)
                              // Get workload color for this teacher
                              const workloadColor = teacher 
                                ? getWorkloadColor(getTeacherWorkload(teacher.id).loadPercentage)
                                : ''
                              return (
                                <td
                                  key={`${cls.id}-${subject.id}`}
                                  className="p-2 text-center border border-gray-200"
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedCell({ classId: cls.id, subjectId: subject.id })
                                      setShowTeacherDialog(true)
                                    }}
                                    className={`w-full p-2 rounded-lg transition-all border ${
                                      teacher
                                        ? workloadColor
                                        : 'bg-gray-50 border-dashed border-gray-300 hover:border-primary hover:bg-purple-50'
                                    }`}
                                  >
                                    {teacher ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                                          {teacher.name[0]}
                                        </div>
                                        <span className="text-xs">{teacher.name}</span>
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 text-xs">
                                        <User className="w-4 h-4 mx-auto opacity-50" />
                                      </div>
                                    )}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Teacher Selection Dialog */}
      <Dialog open={showTeacherDialog} onOpenChange={(open) => {
        setShowTeacherDialog(open)
        if (!open) setSelectedCell(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('assignments.select_teacher_title', { class: classes.find(c => c.id === selectedCell?.classId)?.name, subject: subjects.find(s => s.id === selectedCell?.subjectId)?.name })}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
            {selectedCell && getTeachersForSubject(selectedCell.subjectId).map((teacher) => {
              // Compute actual load from assignments
              const teacherAssignments = assignments.filter(a => a.teacher === teacher.id)
              let computedLoad = 0
              
              teacherAssignments.forEach(assignment => {
                const cls = classes.find(c => c.id === assignment.class)
                if (cls?.discipline) {
                  const disc = disciplines.find(d => d.id === cls.discipline)
                  if (disc?.subjectAllocations) {
                    const alloc = disc.subjectAllocations.find(a => a.subjectId === assignment.subject)
                    computedLoad += alloc?.totalPeriods || 0
                  }
                }
              })
              
              // Fallback if no allocation data
              if (computedLoad === 0 && teacherAssignments.length > 0) {
                computedLoad = teacherAssignments.length * 5
              }
              
              const maxLoad = 25
              const loadPercentage = (computedLoad / maxLoad) * 100
              
              return (
                <button
                  key={teacher.id}
                  onClick={() => assignTeacher(teacher.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border transition-colors bg-white border-gray-200 hover:border-primary hover:bg-purple-50"
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
                    <div className="text-right text-sm">
                      <div className="text-gray-600">{teacherAssignments.length > 0 && t('assignments.load_stat', { current: computedLoad, max: maxLoad, count: teacherAssignments.length })}</div>
                    </div>
                    <Badge
                      className={`text-xs ${
                        loadPercentage < 60 ? 'bg-green-50 text-green-700 border-green-200' :
                        loadPercentage < 85 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {loadPercentage < 60 ? t('assignments.recommend') : loadPercentage < 85 ? t('assignments.moderate') : t('assignments.full')}
                    </Badge>
                  </div>
                </button>
              )
            })}
            
            {selectedCell && getTeachersForSubject(selectedCell.subjectId).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>{t('assignments.no_teachers_for_subject')}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          {t('common.prev')}
        </Button>
        <Button className="bg-primary hover:bg-purple-700" onClick={onNext}>
          {t('common.confirm_next')}
        </Button>
      </div>
    </div>
  )
}
