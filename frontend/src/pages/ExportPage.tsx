import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Icon } from '@iconify/react'
import { Loader2, FileSpreadsheet, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
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

export function ExportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  
  // Data from API
  const [entries, setEntries] = useState<TimetableEntryData[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [teachers, setTeachers] = useState<TeacherInfo[]>([])
  const [maxPeriods, setMaxPeriods] = useState(8)
  
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await timetableApi.getLatest()
      
      setClasses(data.classes)
      setSubjects(data.subjects)
      setTeachers(data.teachers)
      setEntries(data.entries)
      setMaxPeriods(data.maxPeriods || 8)
      
      if (data.classes.length > 0) setSelectedClassId(data.classes[0].id)
      if (data.teachers.length > 0) setSelectedTeacherId(data.teachers[0].id)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build lookup maps
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

  // Excel export functions - copied from TimetableExport
  const handleExportExcel = (type: 'all' | 'class' | 'teacher') => {
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()
      const dayHeaders = [t('resources.period_index', '节次'), ...WEEKDAYS.slice(0, 5).map(day => t(`weekdays.${day}`))]
      
      if (type === 'all') {
        // Export all classes overview
        classes.forEach(cls => {
          const data: string[][] = [dayHeaders] // dayHeaders already localized above
          for (let p = 1; p <= maxPeriods; p++) {
            const row = [t('time_grid.period_label', { period: p })]
            for (let d = 1; d <= 5; d++) {
              const entry = getClassCell(cls.id, d, p)
              if (entry?.static_name) {
                row.push(entry.static_name)
              } else if (entry?.subject_id) {
                const subjectName = subjectNameMap[entry.subject_id] || ''
                const teacherName = entry.teacher_id ? teacherNameMap[entry.teacher_id] : ''
                row.push(teacherName ? `${subjectName} (${teacherName})` : subjectName)
              } else {
                row.push('')
              }
            }
            data.push(row)
          }
          const ws = XLSX.utils.aoa_to_sheet(data)
          ws['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }]
          XLSX.utils.book_append_sheet(wb, ws, cls.name.slice(0, 31))
        })
        XLSX.writeFile(wb, `${t('export.all_timetable_name', '全部课表')}.xlsx`)
      } else if (type === 'class' && selectedClassId) {
        const data: string[][] = [dayHeaders]
        for (let p = 1; p <= maxPeriods; p++) {
          const row = [t('time_grid.period_label', { period: p })]
          for (let d = 1; d <= 5; d++) {
            const entry = getClassCell(selectedClassId, d, p)
            if (entry?.static_name) {
              row.push(entry.static_name)
            } else if (entry?.subject_id) {
              const subjectName = subjectNameMap[entry.subject_id] || ''
              const teacherName = entry.teacher_id ? teacherNameMap[entry.teacher_id] : ''
              row.push(teacherName ? `${subjectName} (${teacherName})` : subjectName)
            } else {
              row.push('')
            }
          }
          data.push(row)
        }
        const ws = XLSX.utils.aoa_to_sheet(data)
        ws['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(wb, ws, t('export.class_timetable', '班级课表'))
        XLSX.writeFile(wb, `${classNameMap[selectedClassId] || t('common.class', '班级')}${t('export.filename_suffix', '课表')}.xlsx`)
      } else if (type === 'teacher' && selectedTeacherId) {
        const data: string[][] = [dayHeaders]
        for (let p = 1; p <= maxPeriods; p++) {
          const row = [t('time_grid.period_label', { period: p })]
          for (let d = 1; d <= 5; d++) {
            const entry = getTeacherCell(selectedTeacherId, d, p)
            if (entry?.subject_id && entry?.class_id) {
              const subjectName = subjectNameMap[entry.subject_id] || ''
              const className = classNameMap[entry.class_id] || ''
              row.push(`${subjectName} (${className})`)
            } else {
              row.push('')
            }
          }
          data.push(row)
        }
        const ws = XLSX.utils.aoa_to_sheet(data)
        ws['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(wb, ws, t('export.teacher_timetable', '教师课表'))
        XLSX.writeFile(wb, `${teacherNameMap[selectedTeacherId] || t('common.teacher', '教师')}${t('export.filename_suffix', '课表')}.xlsx`)
      }
    } finally {
      setExporting(false)
    }
  }

  // PDF export - use backend generation
  const handleExportPDF = async (type: 'class' | 'teacher') => {
    setExporting(true)
    try {
      const id = type === 'class' ? selectedClassId : selectedTeacherId;
      if (!id) return;

      const blob = await timetableApi.downloadPDF(type, id, 'zh'); // Defaulting to zh for now, can be dynamic
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const name = type === 'class' 
        ? classNameMap[id] 
        : teacherNameMap[id];
        
      link.setAttribute('download', `${name || 'timetable'}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export PDF:', err)
      // Optional: Add toast notification here
    } finally {
      setExporting(false)
    }
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

  if (!hasTimetables) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('pages.export', '导出课表')}</h1>
          <p className="text-muted-foreground mt-1">{t('pages.export_desc', '将课表导出为Excel或PDF格式')}</p>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">{t('pages.no_export_data', '暂无可导出的课表')}</h3>
          <p className="text-muted-foreground mb-6">{t('pages.generate_first', '请先生成课表，然后再进行导出')}</p>
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
          <h1 className="text-2xl font-bold text-foreground">{t('pages.export', '导出课表')}</h1>
          <p className="text-muted-foreground mt-1">{t('pages.export_desc', '将课表导出为Excel或PDF格式')}</p>
        </div>
        <Badge className="bg-green-50 text-green-700 border-green-200 text-sm py-1 px-3">
          <CheckCircle2 className="w-4 h-4 mr-1" />
          {t('export.generated', '已生成')} ({entries.length} {t('pages.entries', '条目')})
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon icon="tabler:school" className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{classes.length}</div>
              <div className="text-sm text-muted-foreground">{t('dashboard.stat_classes', '班级')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Icon icon="tabler:users" className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{teachers.length}</div>
              <div className="text-sm text-muted-foreground">{t('dashboard.stat_teachers', '教师')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Icon icon="tabler:table" className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{entries.length}</div>
              <div className="text-sm text-muted-foreground">{t('pages.total_entries', '课程条目')}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Export All Classes */}
      <Card className="p-6 bg-green-600 border-none text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{t('export.all_timetable_name', '全部课表')}</h3>
            <p className="text-sm text-green-50/90">{t('pages.excel_desc', '导出所有班级课表到一个Excel文件，每个班级一个工作表')}</p>
          </div>
          <Button
            onClick={() => handleExportExcel('all')}
            disabled={exporting}
            className="bg-white text-green-700 hover:bg-green-50 hover:text-green-800 font-semibold px-6"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            {t('export.export_all_excel', '导出全部Excel')}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export by Class */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('export.class_timetable', '班级课表')}</h3>
            <div className="flex items-center gap-4">
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleExportExcel('class')}
              disabled={exporting || !selectedClassId}
              className="flex-1 text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportPDF('class')}
              disabled={exporting || !selectedClassId}
              className="flex-1 text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </Card>

        {/* Export by Teacher */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('export.teacher_timetable', '教师课表')}</h3>
            <div className="flex items-center gap-4">
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleExportExcel('teacher')}
              disabled={exporting || !selectedTeacherId}
              className="flex-1 text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportPDF('teacher')}
              disabled={exporting || !selectedTeacherId}
              className="flex-1 text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick View */}
      <Card 
        className="p-8 border-dashed border-2 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group hover:bg-accent/5"
        onClick={() => navigate('/timetables')}
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center transition-transform group-hover:bg-primary/20">
          <Icon icon="tabler:eye" className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-1">{t('pages.view_timetables', '查看课表')}</h3>
          <p className="text-sm text-muted-foreground">{t('pages.view_before_export', '导出前想预览课表？')}</p>
        </div>
        <Button variant="default" className="mt-2">
          {t('pages.go_to_timetables', '前往查看')}
          <Icon icon="tabler:arrow-right" className="w-4 h-4 ml-2" />
        </Button>
      </Card>
    </div>
  )
}
