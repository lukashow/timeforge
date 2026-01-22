import { useState, useEffect, useMemo, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { School, User, Grid3X3, CheckCircle2, Loader2, AlertCircle, Download, FileSpreadsheet } from 'lucide-react'
import { Icon } from '@iconify/react'
import { timetable as timetableApi, type TimetableEntryData } from '@/lib/api'
import { WEEKDAYS } from '@/constants/weekdays'
import * as XLSX from 'xlsx'

interface ClassInfo {
  id: string
  name: string
}

interface SubjectInfo {
  id: string
  name: string
  color: string
}

interface TeacherInfo {
  id: string
  name: string
}

export function TimetablesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('class')
  
  // Data from API
  const [entries, setEntries] = useState<TimetableEntryData[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [teachers, setTeachers] = useState<TeacherInfo[]>([])
  const [maxPeriods, setMaxPeriods] = useState(8)
  const [breaks, setBreaks] = useState<{ afterPeriod: number; name: string; duration: number }[]>([])
  const [staticCourses, setStaticCourses] = useState<{ classId: string; day: number; period: number; name: string; color: string }[]>([])
  
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await timetableApi.getLatest()
      
      setClasses(data.classes)
      setSubjects(data.subjects)
      setTeachers(data.teachers)
      setEntries(data.entries)
      setMaxPeriods(data.maxPeriods || 8)
      setBreaks(data.breaks || [])
      setStaticCourses(data.staticCourses || [])
      
      if (data.classes.length > 0) setSelectedClassId(data.classes[0].id)
      if (data.teachers.length > 0) setSelectedTeacherId(data.teachers[0].id)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError(t('export.error_load', '加载课表数据失败'))
    } finally {
      setLoading(false)
    }
  }

  // Build lookup maps
  const subjectColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    subjects.forEach(s => { map[s.id] = s.color })
    return map
  }, [subjects])

  const subjectNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    subjects.forEach(s => { map[s.id] = s.name })
    return map
  }, [subjects])

  const teacherNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    teachers.forEach(t => { map[t.id] = t.name })
    return map
  }, [teachers])

  const classNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    classes.forEach(c => { map[c.id] = c.name })
    return map
  }, [classes])

  // Group entries by class
  const entriesByClass = useMemo(() => {
    const map: Record<string, TimetableEntryData[]> = {}
    entries.forEach(e => {
      if (!map[e.class_id]) map[e.class_id] = []
      map[e.class_id].push(e)
    })
    return map
  }, [entries])

  // Group entries by teacher
  const entriesByTeacher = useMemo(() => {
    const map: Record<string, TimetableEntryData[]> = {}
    entries.forEach(e => {
      if (e.teacher_id) {
        if (!map[e.teacher_id]) map[e.teacher_id] = []
        map[e.teacher_id].push(e)
      }
    })
    return map
  }, [entries])

  // Get cell for class view
  const getClassCell = (classId: string, day: number, period: number) => {
    const classEntries = entriesByClass[classId] || []
    return classEntries.find(e => e.day === day && e.period === period)
  }

  // Get cell for teacher view
  const getTeacherCell = (teacherId: string, day: number, period: number) => {
    const teacherEntries = entriesByTeacher[teacherId] || []
    return teacherEntries.find(e => e.day === day && e.period === period)
  }

  const handleExportExcel = (type: 'class' | 'teacher') => {
    const wb = XLSX.utils.book_new()
    const dayHeaders = [t('pages.period', '节次'), ...WEEKDAYS.slice(0, 5).map(day => t(`weekdays.${day}`))]
    
    if (type === 'class') {
      const data: string[][] = [dayHeaders]
      for (let p = 1; p <= maxPeriods; p++) {
        const row = [t('time_grid.period_label', { period: p })]
        for (let d = 1; d <= 5; d++) {
          const entry = getClassCell(selectedClassId, d, p)
          const staticCourse = staticCourses.find(sc => sc.classId === selectedClassId && sc.day === d && sc.period === p)
          if (staticCourse) {
            row.push(staticCourse.name)
          } else if (entry?.static_name) {
            row.push(entry.static_name)
          } else if (entry?.subject_id) {
            row.push(subjectNameMap[entry.subject_id] || '')
          } else {
            row.push('')
          }
        }
        data.push(row)
      }
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, classNameMap[selectedClassId] || 'Class')
    } else {
      const data: string[][] = [dayHeaders]
      for (let p = 1; p <= maxPeriods; p++) {
        const row = [t('time_grid.period_label', { period: p })]
        for (let d = 1; d <= 5; d++) {
          const entry = getTeacherCell(selectedTeacherId, d, p)
          if (entry?.subject_id) {
            const className = classNameMap[entry.class_id || ''] || ''
            const subjectName = subjectNameMap[entry.subject_id] || ''
            row.push(`${className} ${subjectName}`)
          } else {
            row.push('')
          }
        }
        data.push(row)
      }
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, teachers.find(t => t.id === selectedTeacherId)?.name || 'Teacher')
    }
    
    XLSX.writeFile(wb, `timetable_${type}_${Date.now()}.xlsx`)
  }

  const hasTimetables = entries.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.loading', '加载中...')}</p>
        </div>
      </div>
    )
  }

  if (error || !hasTimetables) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('pages.timetables', '查看课表')}</h1>
          <p className="text-muted-foreground mt-1">{t('pages.timetables_desc', '查看和导出已生成的课表')}</p>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {error || t('pages.no_timetables', '暂无课表')}
          </h3>
          <p className="text-muted-foreground mb-6">{t('pages.no_timetables_hint', '请先生成课表，然后在此处查看')}</p>
          <Button onClick={() => navigate('/generation')}>
            <Icon icon="tabler:cpu" className="w-4 h-4 mr-2" />
            {t('pages.go_to_generation', '前往生成')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('pages.timetables', '查看课表')}</h1>
          <p className="text-muted-foreground mt-1">{t('pages.timetables_desc', '查看和导出已生成的课表')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-50 text-green-700 border-green-200 text-sm py-1 px-3">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {t('export.generated', '已生成')} ({entries.length} {t('pages.entries', '条目')})
          </Badge>
          <Button variant="outline" onClick={() => navigate('/export')}>
            <Download className="w-4 h-4 mr-2" />
            {t('pages.export', '导出')}
          </Button>
          <Button onClick={() => navigate('/generation')}>
            <Icon icon="tabler:refresh" className="w-4 h-4 mr-2" />
            {t('pages.regenerate', '重新生成')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="class" className="flex items-center gap-2">
            <School className="w-4 h-4" />
            {t('export.class_timetable', '班级课表')}
          </TabsTrigger>
          <TabsTrigger value="teacher" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {t('export.teacher_timetable', '教师课表')}
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            {t('export.overview', '总览')}
          </TabsTrigger>
        </TabsList>

        {/* Class Timetable Tab */}
        <TabsContent value="class">
          <Card className="p-6 bg-white border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-foreground">{t('export.class_timetable', '班级课表')}</h3>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportExcel('class')}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('export.export_excel', '导出Excel')}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-700 bg-gray-50 border border-gray-200 w-20">
                      {t('pages.period', '节次')}
                    </th>
                    {WEEKDAYS.slice(0, 5).map((day) => (
                      <th key={day} className="p-3 text-center font-medium text-gray-700 bg-gray-50 border border-gray-200">
                        {t(`weekdays.${day}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxPeriods }, (_, periodIndex) => {
                    const periodNum = periodIndex + 1
                    const breakAfter = breaks.find(b => b.afterPeriod === periodNum)
                    
                    return (
                      <Fragment key={periodIndex}>
                        <tr>
                          <td className="p-3 text-center font-medium text-gray-600 bg-gray-50 border border-gray-200">
                            {t('time_grid.period_label', { period: periodNum })}
                          </td>
                          {WEEKDAYS.slice(0, 5).map((_, dayIndex) => {
                            const dayNum = dayIndex + 1
                            // Check for static course first
                            const staticCourse = staticCourses.find(
                              sc => sc.classId === selectedClassId && sc.day === dayNum && sc.period === periodNum
                            )
                            
                            if (staticCourse) {
                              return (
                                <td key={dayIndex} className="p-2 border border-gray-200">
                                  <div
                                    className="p-3 rounded-sm text-center transition-all"
                                    style={{ backgroundColor: staticCourse.color + '30', borderLeft: `3px solid ${staticCourse.color}` }}
                                  >
                                    <div className="font-medium" style={{ color: staticCourse.color }}>
                                      {staticCourse.name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{t('export.static_course', '固定课程')}</div>
                                  </div>
                                </td>
                              )
                            }
                            
                            const entry = getClassCell(selectedClassId, dayNum, periodNum)
                            
                            // Check for static course from API (entry.static_name)
                            if (entry?.static_name && !entry?.subject_id) {
                              return (
                                <td key={dayIndex} className="p-2 border border-gray-200">
                                  <div
                                    className="p-3 rounded-sm text-center transition-all"
                                    style={{ backgroundColor: '#37415120', borderLeft: '3px solid #374151' }}
                                  >
                                    <div className="font-medium" style={{ color: '#374151' }}>
                                      {entry.static_name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{t('export.static_course', '固定课程')}</div>
                                  </div>
                                </td>
                              )
                            }
                            
                            const subjectName = entry?.subject_id ? subjectNameMap[entry.subject_id] : null
                            const teacherName = entry?.teacher_id ? teacherNameMap[entry.teacher_id] : null
                            const color = entry?.subject_id ? subjectColorMap[entry.subject_id] : '#E5E7EB'

                            return (
                              <td key={dayIndex} className="p-2 border border-gray-200">
                                {subjectName ? (
                                  <div
                                    className="p-3 rounded-sm text-center transition-all hover:scale-105"
                                    style={{ backgroundColor: color + '20', borderLeft: `3px solid ${color}` }}
                                  >
                                    <div className="font-medium text-gray-900" style={{ color }}>
                                      {subjectName}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">{teacherName || ''}</div>
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-sm text-center bg-gray-50 text-gray-400">
                                    {t('export.free', '空')}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                        {/* Break row */}
                        {breakAfter && (
                          <tr key={`break-${periodIndex}`} className="bg-amber-50">
                            <td colSpan={6} className="p-2 text-center text-amber-700 font-medium border border-amber-200">
                              ☕ {breakAfter.name} {t('export.break_duration', { duration: breakAfter.duration })}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Teacher Timetable Tab */}
        <TabsContent value="teacher">
          <Card className="p-6 bg-white border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-foreground">{t('export.teacher_timetable', '教师课表')}</h3>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportExcel('teacher')}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('export.export_excel', '导出Excel')}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-700 bg-gray-50 border border-gray-200 w-20">
                      {t('pages.period', '节次')}
                    </th>
                    {WEEKDAYS.slice(0, 5).map((day) => (
                      <th key={day} className="p-3 text-center font-medium text-gray-700 bg-gray-50 border border-gray-200">
                        {t(`weekdays.${day}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxPeriods }, (_, periodIndex) => {
                    const periodNum = periodIndex + 1
                    const breakAfter = breaks.find(b => b.afterPeriod === periodNum)
                    
                    return (
                      <Fragment key={periodIndex}>
                        <tr>
                          <td className="p-3 text-center font-medium text-gray-600 bg-gray-50 border border-gray-200">
                            {t('time_grid.period_label', { period: periodNum })}
                          </td>
                          {WEEKDAYS.slice(0, 5).map((_, dayIndex) => {
                            const dayNum = dayIndex + 1
                            const entry = getTeacherCell(selectedTeacherId, dayNum, periodNum)
                            
                            const subjectName = entry?.subject_id ? subjectNameMap[entry.subject_id] : null
                            const className = entry?.class_id ? classNameMap[entry.class_id] : null
                            const color = entry?.subject_id ? subjectColorMap[entry.subject_id] : '#E5E7EB'

                            return (
                              <td key={dayIndex} className="p-2 border border-gray-200">
                                {className ? (
                                  <div
                                    className="p-3 rounded-sm text-center transition-all hover:scale-105"
                                    style={{ backgroundColor: color + '20', borderLeft: `3px solid ${color}` }}
                                  >
                                    <div className="font-medium text-gray-900">
                                      {className}
                                    </div>
                                    <div className="text-xs mt-1" style={{ color }}>
                                      {subjectName || ''}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-sm text-center bg-gray-50 text-gray-400">
                                    {t('export.free', '空')}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                        {/* Break row */}
                        {breakAfter && (
                          <tr key={`break-${periodIndex}`} className="bg-amber-50">
                            <td colSpan={6} className="p-2 text-center text-amber-700 font-medium border border-amber-200">
                              ☕ {breakAfter.name} {t('export.break_duration', { duration: breakAfter.duration })}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card className="p-6 bg-white border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">{t('export.all_timetable_name', '总课表')}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-medium text-gray-700 bg-gray-50 border border-gray-200">{t('common.class', '班级')}</th>
                    {WEEKDAYS.slice(0, 5).map((day, index) => (
                      <th key={day} className="p-2 text-center font-medium text-gray-700 bg-gray-50 border border-gray-200">
                        {t(`weekdays.${['mon', 'tue', 'wed', 'thu', 'fri'][index]}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id}>
                      <td className="p-2 font-medium text-gray-900 bg-gray-50 border border-gray-200">
                        {cls.name}
                      </td>
                      {WEEKDAYS.slice(0, 5).map((_, dayIndex) => (
                        <td key={dayIndex} className="p-1 border border-gray-200">
                          <div className="flex flex-wrap gap-0.5">
                            {Array.from({ length: maxPeriods }, (_, periodIndex) => {
                              const entry = getClassCell(cls.id, dayIndex + 1, periodIndex + 1)
                              // Check for static course
                              const isStatic = entry?.static_name && !entry?.subject_id
                              const color = isStatic ? '#374151' : (entry?.subject_id ? subjectColorMap[entry.subject_id] : '#E5E7EB')
                              const displayName = isStatic ? entry.static_name : (entry?.subject_id ? subjectNameMap[entry.subject_id] : '')
                              return (
                                <div
                                  key={periodIndex}
                                  className="w-5 h-5 rounded text-[10px] flex items-center justify-center text-white font-medium"
                                  style={{ backgroundColor: color }}
                                  title={displayName ? `${displayName} - ${t('time_grid.period_label', { period: periodIndex + 1 })}${isStatic ? ` (${t('export.static_course')})` : ''}` : `${t('export.free')} - ${t('time_grid.period_label', { period: periodIndex + 1 })}`}
                                >
                                  {displayName ? displayName[0] : ''}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Color Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t">
              {subjects.map(subject => (
                <div key={subject.id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="text-sm text-gray-600">{subject.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
