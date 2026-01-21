import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Download, CheckCircle, FileSpreadsheet, FileText, Package } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五'];
const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1);
const PERIOD_TIMES = [
  '08:00-08:45',
  '08:50-09:35',
  '09:45-10:30',
  '10:35-11:20',
  '13:30-14:15',
  '14:20-15:05',
  '15:15-16:00',
  '16:05-16:50',
];

// Mock data - Generate timetable for all classes
const subjects = [
  { name: '数学', short: 'MAT', color: '#8B5CF6' },
  { name: '英语', short: 'ENG', color: '#EC4899' },
  { name: '物理', short: 'PHY', color: '#06B6D4' },
  { name: '化学', short: 'CHEM', color: '#10B981' },
  { name: '生物', short: 'BIO', color: '#F59E0B' },
  { name: '历史', short: 'HIST', color: '#EF4444' },
  { name: '地理', short: 'GEO', color: '#8B5CF6' },
  { name: '体育', short: 'PE', color: '#14B8A6' },
  { name: '音乐', short: 'MUS', color: '#F472B6' },
  { name: '美术', short: 'ART', color: '#A78BFA' },
  { name: '计算机', short: 'CS', color: '#3B82F6' },
  { name: '商科', short: 'BUS', color: '#F97316' },
];

// Generate mock timetable
const generateMockTimetable = () => {
  const classes = Array.from({ length: 16 }, (_, i) => `初一 ${i + 1}`);
  const timetable: any = {};

  classes.forEach((className) => {
    timetable[className] = {};
    WEEKDAYS.forEach((day, dayIndex) => {
      timetable[className][day] = {};
      PERIODS.forEach((period) => {
        // Randomly assign subject
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        timetable[className][day][period] = {
          subject: subject.name,
          short: subject.short,
          color: subject.color,
          teacher: `T${Math.floor(Math.random() * 20) + 1}`,
          room: `R${Math.floor(Math.random() * 50) + 101}`,
        };
      });
    });
  });

  return timetable;
};

const mockTimetable = generateMockTimetable();
const classes = Object.keys(mockTimetable);
const teachers = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);

export function TimetableExport({ onBack }: { onBack?: () => void }) {
  const [selectedClass, setSelectedClass] = useState(classes[0]);
  const [selectedTeacher, setSelectedTeacher] = useState('T1');

  const exportToExcel = (type: 'class' | 'teacher' | 'all') => {
    alert(`导出${type === 'class' ? '班级' : type === 'teacher' ? '教师' : '全部'}课表到 Excel`);
  };

  const exportToPDF = (type: 'class' | 'teacher' | 'all') => {
    alert(`导出${type === 'class' ? '班级' : type === 'teacher' ? '教师' : '全部'}课表到 PDF`);
  };

  return (
    <div className="p-8">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">第七步：查看与导出课表</h1>
        <p className="text-gray-600">查看完整课表、班级课表、教师课表，并导出为各种格式</p>
      </div>

      {/* Quick Export Actions */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <div>
              <h3 className="font-semibold text-gray-900">批量导出</h3>
              <p className="text-sm text-gray-600">一次性导出所有班级和教师的课表</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => exportToExcel('all')}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              导出全部 Excel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => exportToPDF('all')}
            >
              <FileText className="w-4 h-4 mr-2" />
              导出全部 PDF
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">全校总览</TabsTrigger>
          <TabsTrigger value="classes">班级课表</TabsTrigger>
          <TabsTrigger value="teachers">教师课表</TabsTrigger>
        </TabsList>

        {/* All Classes Overview */}
        <TabsContent value="all">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">全校课表总览</h3>
                <p className="text-sm text-gray-600">{classes.length} 个班级 · {subjects.length} 门科目</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
                  <span>数理</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EC4899' }}></div>
                  <span>语言</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#06B6D4' }}></div>
                  <span>科学</span>
                </div>
              </div>
            </div>

            <ScrollArea className="w-full h-[700px]">
              <div className="min-w-max">
                {/* Header Row */}
                <div className="flex gap-1 mb-1 sticky top-0 bg-white z-10 pb-2">
                  <div className="w-16 flex-shrink-0"></div>
                  <div className="w-12 flex-shrink-0"></div>
                  {classes.map((cls) => (
                    <div key={cls} className="w-16 flex-shrink-0 text-center">
                      <div className="text-xs font-bold text-gray-900 mb-1">{cls}</div>
                    </div>
                  ))}
                </div>

                {/* Timetable Grid */}
                {WEEKDAYS.map((day, dayIndex) => (
                  <div key={day}>
                    {PERIODS.map((period, periodIndex) => (
                      <div key={`${day}-${period}`} className="flex gap-1 mb-1">
                        {/* Day label (only on first period) */}
                        {periodIndex === 0 && (
                          <div className="w-16 flex-shrink-0 font-semibold text-gray-900 text-sm flex items-start pt-1">
                            {day}
                          </div>
                        )}
                        {periodIndex > 0 && <div className="w-16 flex-shrink-0"></div>}

                        {/* Period label */}
                        <div className="w-12 flex-shrink-0 text-xs text-gray-600 flex items-center justify-center bg-gray-50 rounded">
                          {period}
                        </div>

                        {/* Classes */}
                        {classes.map((cls) => {
                          const lesson = mockTimetable[cls][day][period];
                          return (
                            <div
                              key={`${cls}-${day}-${period}`}
                              className="w-16 h-12 flex-shrink-0 rounded border border-white overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer group relative"
                              style={{ backgroundColor: lesson.color }}
                            >
                              <div className="p-1 flex flex-col items-center justify-center h-full">
                                <span className="text-[10px] font-bold text-white leading-tight">
                                  {lesson.short}
                                </span>
                              </div>
                              {/* Tooltip on hover */}
                              <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-20">
                                {lesson.subject} - {lesson.teacher}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {/* Day separator */}
                    {dayIndex < WEEKDAYS.length - 1 && <div className="h-2"></div>}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Legend */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">科目图例</h4>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {subjects.map((subject) => (
                  <div key={subject.name} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: subject.color }}
                    ></div>
                    <span className="text-xs text-gray-700">{subject.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* All Classes - Individual Views */}
        <TabsContent value="classes">
          <div className="space-y-6">
            {/* Class Selector and Export */}
            <Card className="p-4 bg-white border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">班级课表</h3>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => exportToExcel('class')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    导出此班级
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => exportToPDF('class')}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </Card>

            {/* Selected Class Timetable */}
            <Card className="p-6 bg-white border border-gray-200">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 w-32">
                        节次
                      </th>
                      {WEEKDAYS.map((day) => (
                        <th key={day} className="p-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 last:border-r-0">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((period, idx) => (
                      <tr key={period} className="border-t border-gray-200">
                        <td className="p-3 bg-gray-50 border-r border-gray-200">
                          <div className="font-medium text-sm text-gray-900">第 {period} 节</div>
                          <div className="text-xs text-gray-500 mt-0.5">{PERIOD_TIMES[idx]}</div>
                        </td>
                        {WEEKDAYS.map((day) => {
                          const lesson = mockTimetable[selectedClass][day][period];
                          return (
                            <td key={day} className="p-2 border-r border-gray-200 last:border-r-0">
                              <div
                                className="p-3 rounded-lg"
                                style={{ backgroundColor: lesson.color + '20', borderLeft: `4px solid ${lesson.color}` }}
                              >
                                <div className="font-semibold text-gray-900 text-sm mb-1">{lesson.subject}</div>
                                <div className="text-xs text-gray-600">教师: {lesson.teacher}</div>
                                <div className="text-xs text-gray-500">教室: {lesson.room}</div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* All Classes List */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">所有班级课表</h3>
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {classes.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedClass === cls
                          ? 'border-primary bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 mb-1">{cls}</div>
                      <div className="text-xs text-gray-600">点击查看详细课表</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>

        {/* All Teachers - Individual Views */}
        <TabsContent value="teachers">
          <div className="space-y-6">
            {/* Teacher Selector and Export */}
            <Card className="p-4 bg-white border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">教师课表</h3>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher} value={teacher}>
                          教师 {teacher}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => exportToExcel('teacher')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    导出此教师
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => exportToPDF('teacher')}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </Card>

            {/* Teacher Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 bg-purple-50 border border-purple-200">
                <div className="text-sm text-purple-700 mb-1">总课时</div>
                <div className="text-2xl font-bold text-purple-900">25 节</div>
              </Card>
              <Card className="p-4 bg-green-50 border border-green-200">
                <div className="text-sm text-green-700 mb-1">授课班级</div>
                <div className="text-2xl font-bold text-green-900">6 个</div>
              </Card>
              <Card className="p-4 bg-blue-50 border border-blue-200">
                <div className="text-sm text-blue-700 mb-1">空窗节数</div>
                <div className="text-2xl font-bold text-blue-900">3 节</div>
              </Card>
            </div>

            {/* Selected Teacher Timetable */}
            <Card className="p-6 bg-white border border-gray-200">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 w-32">
                        节次
                      </th>
                      {WEEKDAYS.map((day) => (
                        <th key={day} className="p-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 last:border-r-0">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((period, idx) => (
                      <tr key={period} className="border-t border-gray-200">
                        <td className="p-3 bg-gray-50 border-r border-gray-200">
                          <div className="font-medium text-sm text-gray-900">第 {period} 节</div>
                          <div className="text-xs text-gray-500 mt-0.5">{PERIOD_TIMES[idx]}</div>
                        </td>
                        {WEEKDAYS.map((day) => {
                          // Find if this teacher teaches in this period
                          let teacherLesson = null;
                          let teacherClass = null;
                          
                          for (const cls of classes) {
                            const lesson = mockTimetable[cls][day][period];
                            if (lesson.teacher === selectedTeacher) {
                              teacherLesson = lesson;
                              teacherClass = cls;
                              break;
                            }
                          }

                          return (
                            <td key={day} className="p-2 border-r border-gray-200 last:border-r-0">
                              {teacherLesson ? (
                                <div
                                  className="p-3 rounded-lg"
                                  style={{ backgroundColor: teacherLesson.color + '20', borderLeft: `4px solid ${teacherLesson.color}` }}
                                >
                                  <div className="font-semibold text-gray-900 text-sm mb-1">{teacherLesson.subject}</div>
                                  <div className="text-xs text-gray-600">班级: {teacherClass}</div>
                                  <div className="text-xs text-gray-500">教室: {teacherLesson.room}</div>
                                </div>
                              ) : (
                                <div className="p-3 text-center text-gray-400 text-sm bg-gray-50 rounded">空闲</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* All Teachers List */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">所有教师课表</h3>
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {teachers.map((teacher) => (
                    <button
                      key={teacher}
                      onClick={() => setSelectedTeacher(teacher)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTeacher === teacher
                          ? 'border-primary bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 mb-1">教师 {teacher}</div>
                      <div className="text-xs text-gray-600">点击查看课表</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bottom Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" className="text-primary border-primary hover:bg-purple-50">
            保存到系统
          </Button>
          <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            完成设置
          </Button>
        </div>
      </div>
    </div>
  );
}
