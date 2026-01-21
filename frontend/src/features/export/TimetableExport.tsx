import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, FileSpreadsheet, FileText, CheckCircle2, Save, School, User, Grid3X3 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { StepProps } from '@/types/common'
import { WEEKDAYS } from '@/constants/weekdays'

const mockClasses = ['高一(1)班', '高一(2)班', '高一(3)班', '高二(1)班', '高二(2)班']
const mockTeachers = ['陈老师', '王老师', '李老师', '张老师', '刘老师']
const mockSubjects = [
  { name: '数学', color: '#8B5CF6' },
  { name: '英语', color: '#EC4899' },
  { name: '物理', color: '#06B6D4' },
  { name: '化学', color: '#10B981' },
  { name: '生物', color: '#F59E0B' },
  { name: '历史', color: '#EF4444' },
  { name: '体育', color: '#14B8A6' },
  { name: '周会', color: '#FCD34D' },
]

// Generate mock timetable data
const generateMockTimetable = () => {
  const timetable: Record<number, Record<number, { subject: string; teacher: string }>> = {}
  for (let day = 0; day < 5; day++) {
    timetable[day] = {}
    for (let period = 1; period <= 8; period++) {
      const subject = mockSubjects[Math.floor(Math.random() * mockSubjects.length)]
      timetable[day][period] = {
        subject: subject.name,
        teacher: mockTeachers[Math.floor(Math.random() * mockTeachers.length)],
      }
    }
  }
  return timetable
}

export function TimetableExport({ onBack }: StepProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedClass, setSelectedClass] = useState(mockClasses[0])
  const [selectedTeacher, setSelectedTeacher] = useState(mockTeachers[0])
  const [timetable] = useState(generateMockTimetable)

  const getSubjectColor = (subjectName: string) => {
    return mockSubjects.find(s => s.name === subjectName)?.color || '#94A3B8'
  }

  const handleExportExcel = (type: 'all' | 'class' | 'teacher') => {
    // Simulate download
    console.log(`Exporting ${type} to Excel...`)
    alert(`已导出 ${type === 'all' ? '全校' : type === 'class' ? selectedClass : selectedTeacher} 课表为 Excel`)
  }

  const handleExportPDF = (type: 'all' | 'class' | 'teacher') => {
    // Simulate download
    console.log(`Exporting ${type} to PDF...`)
    alert(`已导出 ${type === 'all' ? '全校' : type === 'class' ? selectedClass : selectedTeacher} 课表为 PDF`)
  }

  const handleSaveToSystem = () => {
    alert('课表已保存到系统！')
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">第七步：课表预览与导出</h1>
            <p className="text-gray-600">查看生成的课表并导出为各种格式</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-50 text-green-700 border-green-200 text-sm py-1 px-3">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              生成完成
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            全校总览
          </TabsTrigger>
          <TabsTrigger value="class" className="flex items-center gap-2">
            <School className="w-4 h-4" />
            班级课表
          </TabsTrigger>
          <TabsTrigger value="teacher" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            教师课表
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportPDF('all')}
                  className="text-red-700 border-red-300 hover:bg-red-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  导出 PDF
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
                  {mockClasses.map((className) => (
                    <tr key={className}>
                      <td className="p-2 font-medium text-gray-900 bg-gray-50 border border-gray-200">
                        {className}
                      </td>
                      {WEEKDAYS.slice(0, 5).map((_, dayIndex) => (
                        <td key={dayIndex} className="p-1 border border-gray-200">
                          <div className="flex flex-wrap gap-0.5">
                            {Array.from({ length: 8 }, (_, periodIndex) => {
                              const subject = mockSubjects[Math.floor(Math.random() * mockSubjects.length)]
                              return (
                                <div
                                  key={periodIndex}
                                  className="w-5 h-5 rounded text-[10px] flex items-center justify-center text-white font-medium"
                                  style={{ backgroundColor: subject.color }}
                                  title={`${subject.name} - 第${periodIndex + 1}节`}
                                >
                                  {subject.name[0]}
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
              {mockSubjects.map((subject) => (
                <div key={subject.name} className="flex items-center gap-1.5">
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
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClasses.map((cls) => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
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
                  {Array.from({ length: 8 }, (_, periodIndex) => (
                    <tr key={periodIndex}>
                      <td className="p-3 text-center font-medium text-gray-600 bg-gray-50 border border-gray-200">
                        第{periodIndex + 1}节
                      </td>
                      {WEEKDAYS.slice(0, 5).map((_, dayIndex) => {
                        const cell = timetable[dayIndex]?.[periodIndex + 1]
                        const color = getSubjectColor(cell?.subject || '')
                        return (
                          <td key={dayIndex} className="p-2 border border-gray-200">
                            <div
                              className="p-3 rounded-lg text-center transition-all hover:scale-105"
                              style={{ backgroundColor: color + '20', borderLeft: `3px solid ${color}` }}
                            >
                              <div className="font-medium text-gray-900" style={{ color }}>
                                {cell?.subject}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">{cell?.teacher}</div>
                            </div>
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

        {/* Teacher Timetable Tab */}
        <TabsContent value="teacher">
          <Card className="p-6 bg-white border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">教师课表</h3>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTeachers.map((teacher) => (
                      <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
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
                  {Array.from({ length: 8 }, (_, periodIndex) => (
                    <tr key={periodIndex}>
                      <td className="p-3 text-center font-medium text-gray-600 bg-gray-50 border border-gray-200">
                        第{periodIndex + 1}节
                      </td>
                      {WEEKDAYS.slice(0, 5).map((_, dayIndex) => {
                        // Simulate teacher's schedule (some periods free)
                        const hasClass = Math.random() > 0.3
                        if (!hasClass) {
                          return (
                            <td key={dayIndex} className="p-2 border border-gray-200">
                              <div className="p-3 rounded-lg text-center bg-gray-50 text-gray-400">
                                空闲
                              </div>
                            </td>
                          )
                        }
                        const className = mockClasses[Math.floor(Math.random() * mockClasses.length)]
                        const subject = mockSubjects[0]
                        return (
                          <td key={dayIndex} className="p-2 border border-gray-200">
                            <div
                              className="p-3 rounded-lg text-center transition-all hover:scale-105"
                              style={{ backgroundColor: subject.color + '20', borderLeft: `3px solid ${subject.color}` }}
                            >
                              <div className="font-medium text-gray-900">{className}</div>
                              <div className="text-xs mt-1" style={{ color: subject.color }}>{subject.name}</div>
                            </div>
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
