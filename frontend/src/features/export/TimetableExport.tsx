import { useState, useEffect, useMemo, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileSpreadsheet, FileText, CheckCircle2, School, User, Grid3X3, AlertCircle, Loader2, Download, Save } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { StepProps } from '@/types/common'
import { WEEKDAYS } from '@/constants/weekdays'
import { timetable as timetableApi, type TimetableEntryData } from '@/lib/api'
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

export function TimetableExport({ onBack }: StepProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await timetableApi.getLatest()
        
        setClasses(data.classes)
        setSubjects(data.subjects)
        setTeachers(data.teachers)
        setEntries(data.entries)
        setMaxPeriods(data.maxPeriods)
        setBreaks(data.breaks || [])
        setStaticCourses(data.staticCourses || [])

        if (data.classes.length > 0) setSelectedClassId(data.classes[0].id)
        if (data.teachers.length > 0) setSelectedTeacherId(data.teachers[0].id)

        setLoading(false)
      } catch (err) {
        console.error('Failed to load timetable data:', err)
        setError(t('export.error_load'))
        setLoading(false)
      }
    }

    loadData()
  }, [])

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

  const handleExportExcel = (type: 'all' | 'class' | 'teacher') => {
    const wb = XLSX.utils.book_new()
    const dayHeaders = ['节次', ...WEEKDAYS.slice(0, 5)]
    
    if (type === 'all') {
      // Export all classes overview
      classes.forEach(cls => {
        const data: string[][] = [dayHeaders]
        for (let p = 1; p <= maxPeriods; p++) {
          const row = [`第${p}节`]
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
      XLSX.writeFile(wb, '全校课表.xlsx')
    } else if (type === 'class' && selectedClassId) {
      const data: string[][] = [dayHeaders]
      for (let p = 1; p <= maxPeriods; p++) {
        const row = [`第${p}节`]
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
      XLSX.utils.book_append_sheet(wb, ws, '班级课表')
      XLSX.writeFile(wb, `${classNameMap[selectedClassId] || '班级'}_课表.xlsx`)
    } else if (type === 'teacher' && selectedTeacherId) {
      const data: string[][] = [dayHeaders]
      for (let p = 1; p <= maxPeriods; p++) {
        const row = [`第${p}节`]
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
      XLSX.utils.book_append_sheet(wb, ws, '教师课表')
      XLSX.writeFile(wb, `${teacherNameMap[selectedTeacherId] || '教师'}_课表.xlsx`)
    }
  }

  const handleExportPDF = async (type: 'class' | 'teacher') => {
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).default
    
    // Calculate period start times dynamically based on breaks
    // Start at 07:30, each period is 40 minutes
    const startHour = 7
    const startMinute = 30
    const periodDuration = 40 // minutes per period
    
    const periodTimes: string[] = []
    let totalMinutes = startHour * 60 + startMinute
    
    for (let p = 1; p <= maxPeriods; p++) {
      // Add time for break BEFORE this period (if any)
      const breakBefore = breaks.find(b => b.afterPeriod === p - 1)
      if (breakBefore && p > 1) {
        totalMinutes += breakBefore.duration
      }
      
      // Format current time
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      periodTimes.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`)
      
      // Move to end of this period
      totalMinutes += periodDuration
    }
    
    const title = type === 'class' 
      ? (classNameMap[selectedClassId] || '班级')
      : (teacherNameMap[selectedTeacherId] || '教师')
    
    // Build entries data for this view
    const pdfEntries = type === 'class' 
      ? entriesByClass[selectedClassId] || []
      : entriesByTeacher[selectedTeacherId] || []
    
    // Build subject legend data
    const subjectCounts: Record<string, { count: number; teacher: string }> = {}
    if (type === 'class') {
      pdfEntries.forEach(e => {
        if (e.subject_id) {
          if (!subjectCounts[e.subject_id]) {
            const teacherName = e.teacher_id ? teacherNameMap[e.teacher_id] : ''
            subjectCounts[e.subject_id] = { count: 0, teacher: teacherName || '' }
          }
          subjectCounts[e.subject_id].count++
        }
      })
    }
    
    // Create iframe for complete CSS isolation
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 1200px; height: 900px; border: none;'
    document.body.appendChild(iframe)
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      return
    }
    
    // Build the complete HTML with inline styles
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Noto Sans SC', Arial, sans-serif; background: #ffffff; padding: 30px; }
        </style>
      </head>
      <body>
        <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin-bottom: 20px;">${title}</h1>
        <div style="display: flex; gap: 30px;">
          <table style="border-collapse: collapse; flex: 1;">
            <thead>
              <tr>
                <th style="background: #F5F5F5; padding: 12px 8px; font-weight: 500; color: #666666; border-bottom: 2px solid #E5E5E5; width: 70px;"></th>
                ${['星期一', '星期二', '星期三', '星期四', '星期五'].map(day => 
                  `<th style="background: #F5F5F5; padding: 12px 8px; font-weight: 500; color: #555555; border-bottom: 2px solid #E5E5E5; text-align: center; font-size: 15px;">${day}</th>`
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
              下课 (${breakBefore.duration}分钟)
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
          // Ensure hex color
          const hexColor = color.startsWith('#') ? color : '#888888'
          const r = parseInt(hexColor.slice(1, 3), 16)
          const g = parseInt(hexColor.slice(3, 5), 16)
          const b = parseInt(hexColor.slice(5, 7), 16)
          // Lighter background
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
          <td style="padding: 4px; border-bottom: 1px solid #EEEEEE;">
            <div style="background: ${bgColor}; padding: 10px 4px; border-radius: 6px; text-align: center; min-height: 28px;">
              ${displayText ? `
                <div style="color: ${textColor}; font-weight: 600; font-size: 14px;">${displayText}</div>
                ${subText ? `<div style="color: ${textColor}; font-size: 11px; opacity: 0.8; margin-top: 2px;">${subText}</div>` : ''}
              ` : ''}
            </div>
          </td>
        `
      }
      html += `</tr>`
    }
    
    html += `</tbody></table>`
    
    // Legend sidebar (class only)
    if (type === 'class') {
      html += `<div style="width: 160px; padding-top: 10px;">`
      Object.entries(subjectCounts).forEach(([subjectId, data]) => {
        const color = subjectColorMap[subjectId] || '#888888'
        const hexColor = color.startsWith('#') ? color : '#888888'
        const name = subjectNameMap[subjectId] || ''
        html += `
          <div style="margin-bottom: 14px; display: flex; align-items: flex-start; gap: 10px;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background: ${hexColor}; margin-top: 3px; flex-shrink: 0;"></div>
            <div>
              <div style="font-weight: 600; color: #444444; font-size: 13px;">${name}</div>
              <div style="color: #999999; font-size: 11px;">${data.count}节 | ${data.teacher}</div>
            </div>
          </div>
        `
      })
      html += `</div>`
    }
    
    html += `</div></body></html>`
    
    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()
    
    // Wait for font to load
    await new Promise(resolve => setTimeout(resolve, 800))
    
    try {
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight) * 2.1
      
      const x = (pdfWidth - imgWidth * ratio / 2) / 2
      const y = 10
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth * ratio / 2, imgHeight * ratio / 2)
      pdf.save(`${title}_课表.pdf`)
    } finally {
      document.body.removeChild(iframe)
    }
  }

  const handleSaveToSystem = () => {
    alert(t('export.saved'))
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">{t('export.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || entries.length === 0) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">{t('export.step_title_7')}</h1>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {error || t('common.no_data')}
          </h3>
          <p className="text-gray-600 mb-6">{t('export.step_desc_7')}</p>
          <Button variant="outline" onClick={onBack}>
            {t('common.prev')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">{t('export.step_title_7')}</h1>
            <p className="text-gray-600">{t('export.step_desc_7')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-50 text-green-700 border-green-200 text-sm py-1 px-3">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {t('export.generated')} ({entries.length} 条记录)
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            {t('export.overview')}
          </TabsTrigger>
          <TabsTrigger value="class" className="flex items-center gap-2">
            <School className="w-4 h-4" />
            {t('export.class_timetable')}
          </TabsTrigger>
          <TabsTrigger value="teacher" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {t('export.teacher_timetable')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card className="p-6 bg-white border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">全校课表总览</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportExcel('all')}
                  className="text-green-700 border-green-300 hover:bg-green-50"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  导出 Excel
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-medium text-gray-700 bg-gray-50 border border-gray-200">班级</th>
                    {WEEKDAYS.slice(0, 5).map((day) => (
                      <th key={day} className="p-2 text-center font-medium text-gray-700 bg-gray-50 border border-gray-200">
                        {day}
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
                                  title={displayName ? `${displayName} - 第${periodIndex + 1}节${isStatic ? ' (固定)' : ''}` : `空闲 - 第${periodIndex + 1}节`}
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

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-3">
              {subjects.map((subject) => (
                <div key={subject.id} className="flex items-center gap-1.5">
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

        {/* Class Timetable Tab */}
        <TabsContent value="class">
          <Card className="p-6 bg-white border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">班级课表</h3>
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportExcel('class')}
                  className="text-green-700 border-green-300 hover:bg-green-50"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  导出 Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportPDF('class')}
                  className="text-red-700 border-red-300 hover:bg-red-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  导出 PDF
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-700 bg-gray-50 border border-gray-200 w-20">
                      节次
                    </th>
                    {WEEKDAYS.slice(0, 5).map((day) => (
                      <th key={day} className="p-3 text-center font-medium text-gray-700 bg-gray-50 border border-gray-200">
                        {day}
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
                            第{periodNum}节
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
                                    className="p-3 rounded-lg text-center transition-all"
                                    style={{ backgroundColor: staticCourse.color + '30', borderLeft: `3px solid ${staticCourse.color}` }}
                                  >
                                    <div className="font-medium" style={{ color: staticCourse.color }}>
                                      {staticCourse.name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">固定课程</div>
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
                                    className="p-3 rounded-lg text-center transition-all"
                                    style={{ backgroundColor: '#37415120', borderLeft: '3px solid #374151' }}
                                  >
                                    <div className="font-medium" style={{ color: '#374151' }}>
                                      {entry.static_name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">固定课程</div>
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
                                    className="p-3 rounded-lg text-center transition-all hover:scale-105"
                                    style={{ backgroundColor: color + '20', borderLeft: `3px solid ${color}` }}
                                  >
                                    <div className="font-medium text-gray-900" style={{ color }}>
                                      {subjectName}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">{teacherName || ''}</div>
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-lg text-center bg-gray-50 text-gray-400">
                                    空闲
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
                              ☕ {breakAfter.name} ({breakAfter.duration}分钟)
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
                <h3 className="text-lg font-semibold text-gray-900">教师课表</h3>
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportExcel('teacher')}
                  className="text-green-700 border-green-300 hover:bg-green-50"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  导出 Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportPDF('teacher')}
                  className="text-red-700 border-red-300 hover:bg-red-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  导出 PDF
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-700 bg-gray-50 border border-gray-200 w-20">
                      节次
                    </th>
                    {WEEKDAYS.slice(0, 5).map((day) => (
                      <th key={day} className="p-3 text-center font-medium text-gray-700 bg-gray-50 border border-gray-200">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxPeriods }, (_, periodIndex) => (
                    <tr key={periodIndex}>
                      <td className="p-3 text-center font-medium text-gray-600 bg-gray-50 border border-gray-200">
                        第{periodIndex + 1}节
                      </td>
                      {WEEKDAYS.slice(0, 5).map((_, dayIndex) => {
                        const entry = getTeacherCell(selectedTeacherId, dayIndex + 1, periodIndex + 1)
                        const className = entry?.class_id ? classNameMap[entry.class_id] : null
                        const subjectName = entry?.subject_id ? subjectNameMap[entry.subject_id] : null
                        const color = entry?.subject_id ? subjectColorMap[entry.subject_id] : '#E5E7EB'

                        return (
                          <td key={dayIndex} className="p-2 border border-gray-200">
                            {className ? (
                              <div
                                className="p-3 rounded-lg text-center transition-all hover:scale-105"
                                style={{ backgroundColor: color + '20', borderLeft: `3px solid ${color}` }}
                              >
                                <div className="font-medium text-gray-900">{className}</div>
                                <div className="text-xs mt-1" style={{ color }}>{subjectName}</div>
                              </div>
                            ) : (
                              <div className="p-3 rounded-lg text-center bg-gray-50 text-gray-400">
                                空闲
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Actions */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" className="text-primary border-primary hover:bg-purple-50">
            <Download className="w-4 h-4 mr-2" />
            导出全部
          </Button>
          <Button onClick={handleSaveToSystem} className="bg-primary hover:bg-purple-700">
            <Save className="w-4 h-4 mr-2" />
            保存到系统
          </Button>
        </div>
      </div>
    </div>
  )
}
