import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Plus, Trash2, AlertCircle, CheckCircle2, BookOpen, Calendar, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';

interface SubjectAllocation {
  id: string;
  subjectId: string;
  totalPeriods: number;
  doublePeriods: number;
  singlePeriods: number;
  requiresLab: boolean;
}

interface StaticCourse {
  id: string;
  name: string;
  day: number; // 0-6
  period: number; // 1-8
  color: string;
}

interface Discipline {
  id: string;
  name: string;
  category: string;
  subjectAllocations: SubjectAllocation[];
  staticCourses: StaticCourse[];
}

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const mockSubjects = [
  { id: '1', name: '数学', shortName: 'MAT', color: '#8B5CF6' },
  { id: '2', name: '英语', shortName: 'ENG', color: '#EC4899' },
  { id: '3', name: '物理', shortName: 'PHY', color: '#06B6D4' },
  { id: '4', name: '化学', shortName: 'CHEM', color: '#10B981' },
  { id: '5', name: '生物', shortName: 'BIO', color: '#F59E0B' },
  { id: '6', name: '历史', shortName: 'HIST', color: '#EF4444' },
];

export function CurriculumDesign({ onNext, onBack }: { onNext?: () => void; onBack?: () => void }) {
  const [disciplines, setDisciplines] = useState<Discipline[]>([
    {
      id: '1',
      name: '高一理科',
      category: '高中部',
      subjectAllocations: [
        { id: '1', subjectId: '1', totalPeriods: 7, doublePeriods: 2, singlePeriods: 3, requiresLab: false },
        { id: '2', subjectId: '3', totalPeriods: 6, doublePeriods: 1, singlePeriods: 4, requiresLab: true },
      ],
      staticCourses: [
        { id: '1', name: '周会', day: 0, period: 1, color: '#FCD34D' },
      ],
    },
  ]);

  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('1');
  const [newDisciplineName, setNewDisciplineName] = useState('');
  const [showNewDisciplineForm, setShowNewDisciplineForm] = useState(false);
  const [showStaticCourseForm, setShowStaticCourseForm] = useState(false);
  const [newStaticCourse, setNewStaticCourse] = useState({ name: '周会', day: 0, period: 1, color: '#FCD34D' });

  const maxPeriodsPerWeek = 40; // 5 days * 8 periods

  const getCurrentDiscipline = () => disciplines.find(d => d.id === selectedDiscipline);

  const getTotalPeriods = (discipline: Discipline) => {
    return discipline.subjectAllocations.reduce((sum, alloc) => sum + alloc.totalPeriods, 0);
  };

  const addDiscipline = () => {
    if (newDisciplineName.trim()) {
      const newDiscipline: Discipline = {
        id: Date.now().toString(),
        name: newDisciplineName,
        category: '高中部',
        subjectAllocations: [],
        staticCourses: [],
      };
      setDisciplines([...disciplines, newDiscipline]);
      setSelectedDiscipline(newDiscipline.id);
      setNewDisciplineName('');
      setShowNewDisciplineForm(false);
    }
  };

  const addSubjectAllocation = () => {
    const discipline = getCurrentDiscipline();
    if (discipline) {
      const newAllocation: SubjectAllocation = {
        id: Date.now().toString(),
        subjectId: '1',
        totalPeriods: 5,
        doublePeriods: 0,
        singlePeriods: 5,
        requiresLab: false,
      };
      setDisciplines(disciplines.map(d =>
        d.id === selectedDiscipline
          ? { ...d, subjectAllocations: [...d.subjectAllocations, newAllocation] }
          : d
      ));
    }
  };

  const updateAllocation = (allocId: string, field: keyof SubjectAllocation, value: any) => {
    setDisciplines(disciplines.map(d =>
      d.id === selectedDiscipline
        ? {
            ...d,
            subjectAllocations: d.subjectAllocations.map(alloc => {
              if (alloc.id === allocId) {
                const updated = { ...alloc, [field]: value };
                // Auto-calculate singles/doubles
                if (field === 'totalPeriods' || field === 'doublePeriods') {
                  const doubles = field === 'doublePeriods' ? value : alloc.doublePeriods;
                  const total = field === 'totalPeriods' ? value : alloc.totalPeriods;
                  updated.singlePeriods = Math.max(0, total - doubles * 2);
                }
                return updated;
              }
              return alloc;
            }),
          }
        : d
    ));
  };

  const removeAllocation = (allocId: string) => {
    setDisciplines(disciplines.map(d =>
      d.id === selectedDiscipline
        ? { ...d, subjectAllocations: d.subjectAllocations.filter(alloc => alloc.id !== allocId) }
        : d
    ));
  };

  const addStaticCourse = () => {
    if (newStaticCourse.name) {
      const discipline = getCurrentDiscipline();
      if (discipline) {
        setDisciplines(disciplines.map(d =>
          d.id === selectedDiscipline
            ? {
                ...d,
                staticCourses: [...d.staticCourses, { ...newStaticCourse, id: Date.now().toString() }],
              }
            : d
        ));
        setNewStaticCourse({ name: '周会', day: 0, period: 1, color: '#FCD34D' });
        setShowStaticCourseForm(false);
      }
    }
  };

  const removeStaticCourse = (courseId: string) => {
    setDisciplines(disciplines.map(d =>
      d.id === selectedDiscipline
        ? { ...d, staticCourses: d.staticCourses.filter(c => c.id !== courseId) }
        : d
    ));
  };

  const getSubjectById = (id: string) => mockSubjects.find(s => s.id === id);

  const currentDiscipline = getCurrentDiscipline();
  const totalPeriods = currentDiscipline ? getTotalPeriods(currentDiscipline) : 0;
  const isOverCapacity = totalPeriods > maxPeriodsPerWeek;

  return (
    <div className="p-8">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">第三步：设定学科组要求</h1>
        <p className="text-gray-600">为不同学科组配置科目、课时安排和固定课程</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side - Disciplines List */}
        <div className="lg:col-span-1">
          <Card className="p-4 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">学科组列表</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowNewDisciplineForm(!showNewDisciplineForm)}
                className="h-8 w-8 p-0 text-primary hover:bg-purple-50"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {showNewDisciplineForm && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
                <Input
                  placeholder="学科组名称"
                  value={newDisciplineName}
                  onChange={(e) => setNewDisciplineName(e.target.value)}
                  className="bg-white"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewDisciplineForm(false)}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button size="sm" onClick={addDiscipline} className="flex-1 bg-primary hover:bg-purple-700">
                    添加
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {disciplines.map((discipline) => {
                const total = getTotalPeriods(discipline);
                const isSelected = selectedDiscipline === discipline.id;
                const hasIssue = total > maxPeriodsPerWeek;

                return (
                  <button
                    key={discipline.id}
                    onClick={() => setSelectedDiscipline(discipline.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-purple-50 border-primary'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 mb-1">{discipline.name}</div>
                    <div className="text-xs text-gray-600 mb-2">{discipline.category}</div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xs ${hasIssue ? 'text-red-600' : 'text-gray-600'}`}>
                        {total} 节/周
                      </div>
                      {hasIssue && <AlertCircle className="w-3 h-3 text-red-500" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Center - Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subject Allocations */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{currentDiscipline?.name}</h3>
                <p className="text-sm text-gray-600">科目课时配置</p>
              </div>
              <Button
                size="sm"
                onClick={addSubjectAllocation}
                className="bg-primary hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加科目
              </Button>
            </div>

            <div className="space-y-4">
              {currentDiscipline?.subjectAllocations.map((alloc) => {
                const subject = getSubjectById(alloc.subjectId);
                return (
                  <Card key={alloc.id} className="p-4 bg-gray-50 border border-gray-200">
                    <div className="space-y-4">
                      {/* Subject Selection */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {subject && (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white text-xs"
                              style={{ backgroundColor: subject.color }}
                            >
                              {subject.shortName}
                            </div>
                          )}
                          <Select
                            value={alloc.subjectId}
                            onValueChange={(value) => updateAllocation(alloc.id, 'subjectId', value)}
                          >
                            <SelectTrigger className="bg-white flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {mockSubjects.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeAllocation(alloc.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Period Configuration */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">总周课时</Label>
                          <Input
                            type="number"
                            min="1"
                            max="15"
                            value={alloc.totalPeriods}
                            onChange={(e) => updateAllocation(alloc.id, 'totalPeriods', parseInt(e.target.value))}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">双节课数</Label>
                          <Input
                            type="number"
                            min="0"
                            max={Math.floor(alloc.totalPeriods / 2)}
                            value={alloc.doublePeriods}
                            onChange={(e) => updateAllocation(alloc.id, 'doublePeriods', parseInt(e.target.value))}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">单节课数</Label>
                          <Input
                            type="number"
                            value={alloc.singlePeriods}
                            disabled
                            className="bg-gray-100 text-gray-600"
                          />
                        </div>
                      </div>

                      {/* Validation */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-600">
                          计算：{alloc.doublePeriods} × 2 + {alloc.singlePeriods} × 1 = {alloc.doublePeriods * 2 + alloc.singlePeriods} 节
                          {alloc.doublePeriods * 2 + alloc.singlePeriods !== alloc.totalPeriods && (
                            <span className="text-red-600 ml-2">（不匹配！）</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={alloc.requiresLab}
                            onCheckedChange={(checked) => updateAllocation(alloc.id, 'requiresLab', checked)}
                          />
                          <Label className="text-xs cursor-pointer">需要实验班</Label>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {currentDiscipline?.subjectAllocations.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无科目配置</p>
                  <p className="text-sm">点击"添加科目"开始配置</p>
                </div>
              )}
            </div>
          </Card>

          {/* Static Courses */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900">固定课程</h3>
              </div>
              <Button
                size="sm"
                onClick={() => setShowStaticCourseForm(!showStaticCourseForm)}
                className="bg-primary hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加固定课程
              </Button>
            </div>

            {showStaticCourseForm && (
              <Card className="p-4 bg-gray-50 border border-gray-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">课程名称</Label>
                    <Input
                      placeholder="如：周会、班会"
                      value={newStaticCourse.name}
                      onChange={(e) => setNewStaticCourse({ ...newStaticCourse, name: e.target.value })}
                      className="bg-white mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">星期</Label>
                      <Select
                        value={newStaticCourse.day.toString()}
                        onValueChange={(value) => setNewStaticCourse({ ...newStaticCourse, day: parseInt(value) })}
                      >
                        <SelectTrigger className="bg-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.slice(0, 5).map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">第几节</Label>
                      <Select
                        value={newStaticCourse.period.toString()}
                        onValueChange={(value) => setNewStaticCourse({ ...newStaticCourse, period: parseInt(value) })}
                      >
                        <SelectTrigger className="bg-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 8 }, (_, i) => i + 1).map((p) => (
                            <SelectItem key={p} value={p.toString()}>第 {p} 节</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">颜色</Label>
                    <Input
                      type="color"
                      value={newStaticCourse.color}
                      onChange={(e) => setNewStaticCourse({ ...newStaticCourse, color: e.target.value })}
                      className="bg-white mt-1 h-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowStaticCourseForm(false)}
                      className="flex-1"
                    >
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={addStaticCourse}
                      className="flex-1 bg-primary hover:bg-purple-700"
                    >
                      添加
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-2">
              {currentDiscipline?.staticCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                  style={{ backgroundColor: course.color + '20' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white text-xs"
                      style={{ backgroundColor: course.color }}
                    >
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{course.name}</div>
                      <div className="text-sm text-gray-600">
                        {WEEKDAYS[course.day]} 第{course.period}节
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeStaticCourse(course.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {currentDiscipline?.staticCourses.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">暂无固定课程</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Side - Validator */}
        <div className="lg:col-span-1">
          <Card className="p-4 bg-white border border-gray-200 sticky top-4">
            <h3 className="font-semibold text-gray-900 mb-4">实时校验器</h3>

            <div className="space-y-4">
              {/* Total Periods */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">已分配课时</span>
                  <span className={`font-semibold ${isOverCapacity ? 'text-red-600' : 'text-primary'}`}>
                    {totalPeriods}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">可用总课时</span>
                  <span className="font-semibold text-gray-900">{maxPeriodsPerWeek}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isOverCapacity ? 'bg-red-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min((totalPeriods / maxPeriodsPerWeek) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Status */}
              <div className={`p-3 rounded-lg border ${
                isOverCapacity
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-start gap-2">
                  {isOverCapacity ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-red-900 text-sm mb-1">超标警告</div>
                        <div className="text-xs text-red-700">
                          总课时超过可用容量 {totalPeriods - maxPeriodsPerWeek} 节
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-green-900 text-sm mb-1">配置正常</div>
                        <div className="text-xs text-green-700">
                          剩余 {maxPeriodsPerWeek - totalPeriods} 节可分配
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Subject Breakdown */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">科目分布</h4>
                <div className="space-y-2">
                  {currentDiscipline?.subjectAllocations.map((alloc) => {
                    const subject = getSubjectById(alloc.subjectId);
                    return (
                      <div key={alloc.id} className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600">{subject?.name}</span>
                          <span className="font-medium text-gray-900">{alloc.totalPeriods} 节</span>
                        </div>
                        <div className="text-xs text-gray-500 flex gap-2">
                          {alloc.doublePeriods > 0 && (
                            <Badge variant="outline" className="text-xs">{alloc.doublePeriods}双</Badge>
                          )}
                          {alloc.singlePeriods > 0 && (
                            <Badge variant="outline" className="text-xs">{alloc.singlePeriods}单</Badge>
                          )}
                          {alloc.requiresLab && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">实验班</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Static Courses Summary */}
              {currentDiscipline && currentDiscipline.staticCourses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">固定课程</h4>
                  <div className="space-y-1">
                    {currentDiscipline.staticCourses.map((course) => (
                      <div key={course.id} className="text-xs text-gray-600">
                        • {course.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <Button className="bg-primary hover:bg-purple-700" onClick={onNext} disabled={isOverCapacity}>
          确认配置，下一步
        </Button>
      </div>
    </div>
  );
}
