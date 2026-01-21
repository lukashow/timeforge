import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Users, Sparkles, User, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';

interface Class {
  id: string;
  name: string;
  category: string;
  discipline: string;
  formTeacher: string | null;
  formTeacherReason?: string;
}

interface Teacher {
  id: string;
  name: string;
  subject: string;
  load: 'light' | 'medium' | 'heavy';
}

const mockTeachers: Teacher[] = [
  { id: '1', name: '陈老师', subject: '数学', load: 'light' },
  { id: '2', name: '王老师', subject: '英语', load: 'light' },
  { id: '3', name: '李老师', subject: '物理', load: 'medium' },
  { id: '4', name: '张老师', subject: '化学', load: 'light' },
  { id: '5', name: '刘老师', subject: '数学', load: 'medium' },
  { id: '6', name: '周老师', subject: '英语', load: 'light' },
  { id: '7', name: '赵老师', subject: '物理', load: 'light' },
  { id: '8', name: '孙老师', subject: '化学', load: 'medium' },
  { id: '9', name: '吴老师', subject: '生物', load: 'light' },
  { id: '10', name: '郑老师', subject: '历史', load: 'light' },
];

export function ClassFactory({ onNext, onBack }: { onNext?: () => void; onBack?: () => void }) {
  const [classPrefix, setClassPrefix] = useState('初一');
  const [startNumber, setStartNumber] = useState(1);
  const [endNumber, setEndNumber] = useState(30);
  const [selectedCategory, setSelectedCategory] = useState('初中部');
  const [selectedDiscipline, setSelectedDiscipline] = useState('初中部-综合');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState<string | null>(null);
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);

  const categories = ['初中部', '高中文商', '高中理科'];
  const disciplines = {
    '初中部': ['初中部-综合'],
    '高中文商': ['高一文科', '高一商科', '高二文科', '高二商科'],
    '高中理科': ['高一理科', '高二理科', '高三理科'],
  };

  const generateClasses = () => {
    const newClasses: Class[] = [];
    for (let i = startNumber; i <= endNumber; i++) {
      newClasses.push({
        id: `${Date.now()}_${i}`,
        name: `${classPrefix} ${i}`,
        category: selectedCategory,
        discipline: selectedDiscipline,
        formTeacher: null,
      });
    }
    setClasses(newClasses);
  };

  // Get teachers who are already assigned as form teachers
  const getAssignedTeachers = () => {
    return classes
      .filter(cls => cls.formTeacher !== null)
      .map(cls => cls.formTeacher);
  };

  // Get available teachers (not assigned yet)
  const getAvailableTeachers = () => {
    const assignedTeachers = getAssignedTeachers();
    return mockTeachers.filter(teacher => !assignedTeachers.includes(teacher.name));
  };

  const autoAssignFormTeachers = () => {
    const availableTeachers = [...mockTeachers];
    let teacherIndex = 0;

    setClasses(prevClasses =>
      prevClasses.map((cls) => {
        // Skip if already has a form teacher
        if (cls.formTeacher) return cls;

        // Get next available teacher (cycling through if needed)
        const teacher = availableTeachers[teacherIndex % availableTeachers.length];
        teacherIndex++;

        return {
          ...cls,
          formTeacher: teacher.name,
          formTeacherReason: `${teacher.subject}教师 · 工作量${teacher.load === 'light' ? '较轻' : teacher.load === 'medium' ? '适中' : '较重'}`,
        };
      })
    );
  };

  const assignFormTeacher = (classId: string, teacherName: string) => {
    const teacher = mockTeachers.find(t => t.name === teacherName);
    if (!teacher) return;

    setClasses(prevClasses =>
      prevClasses.map(cls =>
        cls.id === classId
          ? {
              ...cls,
              formTeacher: teacher.name,
              formTeacherReason: `${teacher.subject}教师 · 工作量${teacher.load === 'light' ? '较轻' : teacher.load === 'medium' ? '适中' : '较重'}`,
            }
          : cls
      )
    );
    setShowTeacherDialog(false);
    setSelectedClassForTeacher(null);
  };

  const removeFormTeacher = (classId: string) => {
    setClasses(prevClasses =>
      prevClasses.map(cls =>
        cls.id === classId
          ? { ...cls, formTeacher: null, formTeacherReason: undefined }
          : cls
      )
    );
  };

  const openTeacherDialog = (classId: string) => {
    setSelectedClassForTeacher(classId);
    setShowTeacherDialog(true);
  };

  const assignedCount = classes.filter(cls => cls.formTeacher !== null).length;
  const availableTeachersCount = getAvailableTeachers().length;

  return (
    <div className="p-8">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">第四步：一键生成班级</h1>
        <p className="text-gray-600">批量创建班级并智能分配班导师（每位老师只能担任一个班级的班导）</p>
      </div>

      {/* Category Selection */}
      <Card className="p-6 bg-white border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">课程体系选择</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-700 mb-2 block">选择类别</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-[#F9FAFB]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700 mb-2 block">选择学科组</Label>
            <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
              <SelectTrigger className="bg-[#F9FAFB]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {disciplines[selectedCategory as keyof typeof disciplines]?.map((disc) => (
                  <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Bulk Generation */}
      <Card className="p-6 bg-white border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">批量生成控制</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label className="text-gray-700 mb-2 block">班级前缀</Label>
            <Input
              placeholder="如：初一、高二"
              value={classPrefix}
              onChange={(e) => setClassPrefix(e.target.value)}
              className="bg-[#F9FAFB]"
            />
          </div>

          <div>
            <Label className="text-gray-700 mb-2 block">从 第 __ 班</Label>
            <Input
              type="number"
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(parseInt(e.target.value))}
              className="bg-[#F9FAFB]"
            />
          </div>

          <div>
            <Label className="text-gray-700 mb-2 block">到 第 __ 班</Label>
            <Input
              type="number"
              min="1"
              value={endNumber}
              onChange={(e) => setEndNumber(parseInt(e.target.value))}
              className="bg-[#F9FAFB]"
            />
          </div>

          <div className="flex items-end">
            <Button onClick={generateClasses} className="w-full bg-primary hover:bg-purple-700">
              <Users className="w-5 h-5 mr-2" />
              生成 {endNumber - startNumber + 1} 个班级
            </Button>
          </div>
        </div>

        {endNumber - startNumber + 1 > mockTeachers.length && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-900">
              <strong>提示：</strong> 您将生成 {endNumber - startNumber + 1} 个班级，但系统只有 {mockTeachers.length} 位老师。
              部分班级可能无法分配班导师，或需要一位老师担任多个班级的班导（不推荐）。
            </div>
          </div>
        )}
      </Card>

      {/* Classes Grid */}
      {classes.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">已生成班级</h3>
              <p className="text-sm text-gray-600">
                共 {classes.length} 个班级 · 已分配班导 {assignedCount} / {classes.length} · 
                可用教师 {availableTeachersCount} 位
              </p>
            </div>
            <Button
              onClick={autoAssignFormTeachers}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              智能一键分配班导师
            </Button>
          </div>

          {/* Warning if not enough teachers */}
          {classes.length > mockTeachers.length && (
            <Card className="p-4 bg-red-50 border border-red-200 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">班导师不足</h4>
                  <p className="text-sm text-red-700">
                    班级数量（{classes.length}）超过可用教师数量（{mockTeachers.length}）。
                    建议减少班级数量或添加更多教师。
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                className="p-5 bg-white border border-gray-200 hover:border-primary transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{cls.name}</h4>
                    <p className="text-xs text-gray-500">{cls.discipline}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-gray-600">班导师</Label>
                    {cls.formTeacher && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFormTeacher(cls.id)}
                        className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        移除
                      </Button>
                    )}
                  </div>
                  {cls.formTeacher ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-white text-xs">
                          {cls.formTeacher[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{cls.formTeacher}</div>
                        {cls.formTeacherReason && (
                          <div className="text-xs text-gray-500 truncate">{cls.formTeacherReason}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openTeacherDialog(cls.id)}
                      className="w-full border-dashed border-gray-300 hover:border-primary hover:bg-purple-50"
                    >
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-600">选择班导师</span>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {classes.length === 0 && (
        <Card className="p-12 bg-white border border-gray-200 border-dashed">
          <div className="text-center text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">尚未生成班级</p>
            <p className="text-sm">请设置参数后点击"生成班级"按钮</p>
          </div>
        </Card>
      )}

      {/* Teacher Selection Dialog */}
      <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>选择班导师</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              为 <strong>{classes.find(c => c.id === selectedClassForTeacher)?.name}</strong> 选择班导师
            </p>
            
            {availableTeachersCount === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-yellow-900 font-medium mb-1">没有可用的老师</p>
                <p className="text-xs text-yellow-700">所有老师都已被分配为班导师</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {getAvailableTeachers().map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => assignFormTeacher(selectedClassForTeacher!, teacher.name)}
                    className="w-full p-3 bg-gray-50 hover:bg-purple-50 rounded-lg border border-gray-200 hover:border-primary transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary text-white">
                          {teacher.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{teacher.name}</div>
                        <div className="text-sm text-gray-600">
                          {teacher.subject} · 工作量
                          {teacher.load === 'light' ? '较轻' : teacher.load === 'medium' ? '适中' : '较重'}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          teacher.load === 'light'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : teacher.load === 'medium'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }
                      >
                        {teacher.load === 'light' ? '推荐' : teacher.load === 'medium' ? '可选' : '繁忙'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {availableTeachersCount > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                剩余 {availableTeachersCount} 位可用教师
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowTeacherDialog(false);
                setSelectedClassForTeacher(null);
              }}
            >
              取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <Button className="bg-primary hover:bg-purple-700" onClick={onNext} disabled={classes.length === 0}>
          确认班级配置，下一步
        </Button>
      </div>
    </div>
  );
}
