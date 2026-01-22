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
  const [breaks, setBreaks] = useState<{ afterPeriod: number; name: string; duration: number }[]>([])
  
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
      setBreaks(data.breaks || [])
      
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

  const subjectColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    subjects.forEach(s => { map[s.id] = s.color })
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

  // PDF export - copied from TimetableExport
  const handleExportPDF = async (type: 'class' | 'teacher') => {
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      
      // Calculate period start times dynamically based on breaks
      const startHour = 7
      const startMinute = 30
      const periodDuration = 40 // minutes per period
      
      const periodTimes: string[] = []
      let totalMinutes = startHour * 60 + startMinute
      
      for (let p = 1; p <= maxPeriods; p++) {
        const breakBefore = breaks.find(b => b.afterPeriod === p - 1)
        if (breakBefore && p > 1) {
          totalMinutes += breakBefore.duration
        }
        
        const startH = Math.floor(totalMinutes / 60)
        const startM = totalMinutes % 60
        const endMinutes = totalMinutes + periodDuration
        const endH = Math.floor(endMinutes / 60)
        const endM = endMinutes % 60
        
        periodTimes.push(`${t('time_grid.period_label', { period: p })}\n${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}-${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`)
        
        totalMinutes = endMinutes
      }
      
      const title = type === 'class' 
        ? `${classNameMap[selectedClassId] || ''} ${t('export.class_timetable', '班级课表')}`
        : `${teacherNameMap[selectedTeacherId] || ''} ${t('export.teacher_timetable', '教师课表')}`
      
      // Build HTML for PDF
      let html = `
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: #ffffff; padding: 30px; }
          </style>
        </head>
        <body>
          <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin-bottom: 20px;">${title}</h1>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr>
                <th style="background: #F5F5F5; padding: 12px 8px; font-weight: 500; color: #666666; border-bottom: 2px solid #E5E5E5; width: 70px;"></th>
                ${WEEKDAYS.slice(0, 5).map(day => 
                  `<th style="background: #F5F5F5; padding: 12px 8px; font-weight: 500; color: #555555; border-bottom: 2px solid #E5E5E5; text-align: center;">${t(`weekdays.${day}`)}</th>`
                ).join('')}
              </tr>
            </thead>
            <tbody>
      `
      
      for (let p = 1; p <= maxPeriods; p++) {
        const breakBefore = breaks.find(b => b.afterPeriod === p - 1)
        if (breakBefore && p > 1) {
          html += `
            <tr>
              <td colspan="6" style="background: #555555; color: #ffffff; text-align: center; padding: 8px; font-size: 13px; font-weight: 500;">
                ${t('export.break', '课间')} (${breakBefore.duration}${t('export.minutes', '分钟')})
              </td>
            </tr>
          `
        }
        
        const timeStr = periodTimes[p - 1] || ''
        html += `<tr>`
        html += `<td style="padding: 8px; color: #888888; font-size: 13px; border-bottom: 1px solid #EEEEEE; font-weight: 500;">${timeStr}</td>`
        
        for (let d = 1; d <= 5; d++) {
          const entry = type === 'class' 
            ? getClassCell(selectedClassId, d, p)
            : getTeacherCell(selectedTeacherId, d, p)
          
          let bgColor = '#F8F8F8'
          let textColor = '#AAAAAA'
          let displayText = ''
          let subText = ''
          
          if (entry?.static_name && !entry?.subject_id) {
            bgColor = '#374151'
            textColor = '#FFFFFF'
            displayText = entry.static_name
          } else if (entry?.subject_id) {
            const color = subjectColorMap[entry.subject_id] || '#E5E7EB'
            const hexColor = color.startsWith('#') ? color : '#888888'
            const r = parseInt(hexColor.slice(1, 3), 16)
            const g = parseInt(hexColor.slice(3, 5), 16)
            const b = parseInt(hexColor.slice(5, 7), 16)
            const bgR = Math.min(255, r + Math.floor((255 - r) * 0.75))
            const bgG = Math.min(255, g + Math.floor((255 - g) * 0.75))
            const bgB = Math.min(255, b + Math.floor((255 - b) * 0.75))
            bgColor = `#${bgR.toString(16).padStart(2, '0')}${bgG.toString(16).padStart(2, '0')}${bgB.toString(16).padStart(2, '0')}`
            textColor = '#333333'
            displayText = type === 'class' 
              ? (subjectNameMap[entry.subject_id] || '')
              : (classNameMap[entry.class_id!] || '')
            if (type === 'teacher') {
              subText = subjectNameMap[entry.subject_id] || ''
            }
          }
          
          html += `
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #EEEEEE;">
              <div style="background: ${bgColor}; padding: 12px 8px; border-radius: 4px;">
                <div style="color: ${textColor}; font-weight: 500; font-size: 14px;">${displayText || '-'}</div>
                ${subText ? `<div style="color: #888888; font-size: 11px; margin-top: 4px;">${subText}</div>` : ''}
              </div>
            </td>
          `
        }
        html += `</tr>`
      }
      
      html += `
            </tbody>
          </table>
        </body>
        </html>
      `
      
      // Create temporary element for PDF generation
      const container = document.createElement('div')
      container.innerHTML = html
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = '800px'
      document.body.appendChild(container)
      
      const canvas = await html2canvas(container, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20))
      pdf.save(`${title}.pdf`)
      
      document.body.removeChild(container)
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
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-primary/20">
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
