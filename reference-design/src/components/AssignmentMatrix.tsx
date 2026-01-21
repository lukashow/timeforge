import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Sparkles, AlertCircle } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface Teacher {
  id: string;
  name: string;
  subject: string;
  currentLoad: number;
  maxLoad: number;
}

interface Assignment {
  classId: string;
  subject: string;
  teacherId: string | null;
}

// Generate classes by grade
const grades = {
  '初一': Array.from({ length: 30 }, (_, i) => `初一 ${i + 1}`),
  '初二': Array.from({ length: 28 }, (_, i) => `初二 ${i + 1}`),
  '初三': Array.from({ length: 25 }, (_, i) => `初三 ${i + 1}`),
  '高一': Array.from({ length: 20 }, (_, i) => `高一 ${i + 1}`),
  '高二': Array.from({ length: 18 }, (_, i) => `高二 ${i + 1}`),
  '高三': Array.from({ length: 15 }, (_, i) => `高三 ${i + 1}`),
};

const subjects = ['数学', '英语', '物理', '化学', '生物', '历史'];

const teachers: Teacher[] = [
  { id: '1', name: '陈老师', subject: '数学', currentLoad: 12, maxLoad: 25 },
  { id: '2', name: '王老师', subject: '英语', currentLoad: 15, maxLoad: 25 },
  { id: '3', name: '李老师', subject: '物理', currentLoad: 10, maxLoad: 20 },
  { id: '4', name: '张老师', subject: '化学', currentLoad: 8, maxLoad: 22 },
  { id: '5', name: '刘老师', subject: '数学', currentLoad: 18, maxLoad: 25 },
  { id: '6', name: '周老师', subject: '英语', currentLoad: 10, maxLoad: 22 },
];

export function AssignmentMatrix({ onNext, onBack }: { onNext?: () => void; onBack?: () => void }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ classId: string; subject: string } | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>('初一');

  const currentClasses = grades[selectedGrade as keyof typeof grades] || [];

  const getAssignment = (classId: string, subject: string) => {
    return assignments.find(a => a.classId === classId && a.subject === subject);
  };

  const assignTeacher = (classId: string, subject: string, teacherId: string) => {
    setAssignments(prev => {
      const existing = prev.find(a => a.classId === classId && a.subject === subject);
      if (existing) {
        return prev.map(a =>
          a.classId === classId && a.subject === subject
            ? { ...a, teacherId }
            : a
        );
      }
      return [...prev, { classId, subject, teacherId }];
    });
    setSelectedCell(null);
  };

  const getTeacherById = (id: string) => teachers.find(t => t.id === id);

  const getRecommendedTeachers = (subject: string) => {
    return teachers
      .filter(t => t.subject === subject)
      .sort((a, b) => a.currentLoad - b.currentLoad);
  };

  const autoAssignAll = () => {
    const allClasses = Object.values(grades).flat();
    const newAssignments: Assignment[] = [];
    allClasses.forEach(cls => {
      subjects.forEach(subject => {
        const recommended = getRecommendedTeachers(subject);
        if (recommended.length > 0) {
          newAssignments.push({
            classId: cls,
            subject,
            teacherId: recommended[0].id,
          });
        }
      });
    });
    setAssignments(newAssignments);
  };

  const totalClasses = Object.values(grades).flat().length;
  const totalSlots = totalClasses * subjects.length;
  const assignedSlots = assignments.length;

  return (
    <div className="p-8">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">第五步：指派任课老师</h1>
        <p className="text-gray-600">按年段为每个班级的每门科目分配任课教师</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Matrix */}
        <div className="lg:col-span-3">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">任务矩阵</h3>
                  <p className="text-sm text-gray-600">点击单元格选择教师</p>
                </div>
              </div>
              <Button
                onClick={autoAssignAll}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                智能自动分配全部
              </Button>
            </div>

            {/* Grade Tabs */}
            <Tabs value={selectedGrade} onValueChange={setSelectedGrade} className="w-full">
              <TabsList className="mb-4">
                {Object.keys(grades).map((grade) => (
                  <TabsTrigger key={grade} value={grade}>
                    {grade} ({grades[grade as keyof typeof grades].length}班)
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.keys(grades).map((grade) => (
                <TabsContent key={grade} value={grade}>
                  <ScrollArea className="w-full h-[600px]">
                    <div className="min-w-full">
                      {/* Header */}
                      <div className="flex gap-1 mb-1 sticky top-0 bg-white z-10">
                        <div className="w-16 flex-shrink-0"></div>
                        {grades[grade as keyof typeof grades].map((cls) => (
                          <div key={cls} className="w-24 flex-shrink-0 text-center text-xs font-semibold text-gray-700 py-2">
                            {cls}
                          </div>
                        ))}
                      </div>

                      {/* Rows */}
                      <div className="space-y-1">
                        {subjects.map((subject) => (
                          <div key={subject} className="flex gap-1">
                            <div className="w-16 flex-shrink-0 flex items-center justify-center bg-purple-50 rounded text-xs font-medium text-gray-900">
                              {subject}
                            </div>
                            {grades[grade as keyof typeof grades].map((cls) => {
                              const assignment = getAssignment(cls, subject);
                              const teacher = assignment?.teacherId ? getTeacherById(assignment.teacherId) : null;
                              const isSelected = selectedCell?.classId === cls && selectedCell?.subject === subject;

                              return (
                                <button
                                  key={`${cls}-${subject}`}
                                  onClick={() => setSelectedCell({ classId: cls, subject })}
                                  className={`w-24 flex-shrink-0 p-1.5 rounded border transition-all text-xs ${
                                    isSelected
                                      ? 'border-primary bg-purple-50 ring-2 ring-primary'
                                      : teacher
                                      ? 'border-green-200 bg-green-50 hover:border-green-300'
                                      : 'border-gray-200 bg-white hover:border-gray-300'
                                  }`}
                                >
                                  {teacher ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-[10px]">
                                        {teacher.name[0]}
                                      </div>
                                      <span className="text-[10px] font-medium text-gray-900 truncate w-full">
                                        {teacher.name}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-gray-400 py-2">未分配</div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <div>
                      {grade}：已分配 {assignments.filter(a => a.classId.startsWith(grade)).length} / {grades[grade as keyof typeof grades].length * subjects.length}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
                        <span>已分配</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
                        <span>未分配</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Overall Progress */}
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">总体进度</span>
                <span className="text-sm font-semibold text-primary">
                  {assignedSlots} / {totalSlots} ({Math.round((assignedSlots / totalSlots) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(assignedSlots / totalSlots) * 100}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-600">
                共 {totalClasses} 个班级 · {subjects.length} 门科目
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4 bg-white border border-gray-200 sticky top-4">
            {selectedCell ? (
              <>
                <h3 className="font-semibold text-gray-900 mb-4">智能推荐</h3>
                <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-sm text-gray-600">为以下岗位分配教师：</div>
                  <div className="font-semibold text-gray-900 mt-1">
                    {selectedCell.classId}
                  </div>
                  <div className="text-sm text-primary mt-0.5">
                    {selectedCell.subject}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {getRecommendedTeachers(selectedCell.subject).map((teacher, index) => {
                    const loadPercentage = (teacher.currentLoad / teacher.maxLoad) * 100;
                    const isOverloaded = loadPercentage > 80;

                    return (
                      <button
                        key={teacher.id}
                        onClick={() => assignTeacher(selectedCell.classId, selectedCell.subject, teacher.id)}
                        className="w-full p-3 bg-gray-50 hover:bg-purple-50 rounded-lg border border-gray-200 hover:border-primary transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="bg-primary text-white text-xs">
                              {teacher.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">{teacher.name}</div>
                            <div className="text-xs text-gray-600">
                              {teacher.currentLoad}/{teacher.maxLoad} 节
                            </div>
                          </div>
                          {index === 0 && (
                            <Badge className="bg-primary text-white text-xs">推荐</Badge>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isOverloaded ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${loadPercentage}%` }}
                          />
                        </div>
                        {isOverloaded && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            <span className="text-xs text-red-600">工作量较高</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedCell(null)}
                  className="w-full"
                >
                  取消选择
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 mb-4">教师负荷状态</h3>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {teachers.map((teacher) => {
                      const loadPercentage = (teacher.currentLoad / teacher.maxLoad) * 100;
                      const isOverloaded = loadPercentage > 80;

                      return (
                        <div key={teacher.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="bg-primary text-white text-xs">
                                {teacher.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900">{teacher.name}</div>
                              <div className="text-xs text-gray-600">{teacher.subject}</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isOverloaded ? 'bg-red-500' : loadPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${loadPercentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {teacher.currentLoad}/{teacher.maxLoad} 节 ({Math.round(loadPercentage)}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <Button className="bg-primary hover:bg-purple-700" onClick={onNext}>
          确认分配，下一步
        </Button>
      </div>
    </div>
  );
}
