import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Upload, Download, Plus, X, User, BookOpen, Building2, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Subject {
  id: string;
  name: string;
  shortName: string;
  color: string;
  requiresLab: boolean;
}

interface Teacher {
  id: string;
  name: string;
  subjectId: string;
  weeklyLoad: number;
  unavailable: number[][];
}

interface Room {
  id: string;
  name: string;
  tags: string[];
}

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1);

export function ResourceLibrary({ onNext, onBack }: { onNext?: () => void; onBack?: () => void }) {
  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: '1', name: '数学', shortName: 'MAT', color: '#8B5CF6', requiresLab: false },
    { id: '2', name: '英语', shortName: 'ENG', color: '#EC4899', requiresLab: false },
    { id: '3', name: '物理', shortName: 'PHY', color: '#06B6D4', requiresLab: true },
    { id: '4', name: '化学', shortName: 'CHEM', color: '#10B981', requiresLab: true },
  ]);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', shortName: '', color: '#8B5CF6', requiresLab: false });

  // Teachers
  const [teachers, setTeachers] = useState<Teacher[]>([
    { id: '1', name: '陈老师', subjectId: '1', weeklyLoad: 25, unavailable: [] },
    { id: '2', name: '王老师', subjectId: '2', weeklyLoad: 22, unavailable: [] },
    { id: '3', name: '李老师', subjectId: '3', weeklyLoad: 20, unavailable: [] },
  ]);
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [newTeacher, setNewTeacher] = useState({ name: '', subjectId: '', weeklyLoad: 25 });
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');

  // Rooms
  const [rooms, setRooms] = useState<Room[]>([
    { id: '1', name: '教室 101', tags: [] },
    { id: '2', name: '实验室 1', tags: ['Science', 'Lab'] },
    { id: '3', name: '计算机室 1', tags: ['Computer'] },
  ]);
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkStart, setBulkStart] = useState(1);
  const [bulkEnd, setBulkEnd] = useState(10);

  const addSubject = () => {
    if (newSubject.name && newSubject.shortName) {
      setSubjects([...subjects, { ...newSubject, id: Date.now().toString() }]);
      setNewSubject({ name: '', shortName: '', color: '#8B5CF6', requiresLab: false });
      setShowSubjectDialog(false);
    }
  };

  const addTeacher = () => {
    if (newTeacher.name && newTeacher.subjectId) {
      setTeachers([...teachers, { ...newTeacher, id: Date.now().toString(), unavailable: [] }]);
      setNewTeacher({ name: '', subjectId: '', weeklyLoad: 25 });
      setShowTeacherDialog(false);
    }
  };

  const removeTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
  };

  const updateTeacherLoad = (id: string, load: number) => {
    setTeachers(teachers.map(t => t.id === id ? { ...t, weeklyLoad: load } : t));
  };

  const bulkUpdateLoad = (load: number) => {
    setTeachers(teachers.map(t => 
      selectedTeachers.includes(t.id) ? { ...t, weeklyLoad: load } : t
    ));
    setSelectedTeachers([]);
  };

  const toggleTeacherSelection = (id: string) => {
    setSelectedTeachers(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const getSubjectById = (id: string) => subjects.find(s => s.id === id);

  const filteredTeachers = teachers.filter(t => {
    const matchesName = t.name.toLowerCase().includes(teacherFilter.toLowerCase());
    const matchesSubject = subjectFilter === 'all' || t.subjectId === subjectFilter;
    return matchesName && matchesSubject;
  });

  const bulkCreateRooms = () => {
    if (bulkPrefix && bulkStart <= bulkEnd) {
      const newRooms = Array.from({ length: bulkEnd - bulkStart + 1 }, (_, i) => ({
        id: `${Date.now()}_${i}`,
        name: `${bulkPrefix}${bulkStart + i}`,
        tags: [],
      }));
      setRooms([...rooms, ...newRooms]);
      setBulkPrefix('');
      setBulkStart(1);
      setBulkEnd(10);
    }
  };

  return (
    <div className="p-8">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">第二步：录入教学资源</h1>
        <p className="text-gray-600">先创建科目，再添加教师和教室信息</p>
      </div>

      <Tabs defaultValue="subjects" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            科目
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            老师
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            教室
          </TabsTrigger>
        </TabsList>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">科目列表</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50">
                  <Download className="w-4 h-4 mr-2" />
                  下载模板
                </Button>
                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50">
                  <Upload className="w-4 h-4 mr-2" />
                  导入 Excel
                </Button>
                <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      添加科目
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加新科目</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>科目名称</Label>
                        <Input
                          placeholder="如：数学"
                          value={newSubject.name}
                          onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>简称</Label>
                        <Input
                          placeholder="如：MAT"
                          value={newSubject.shortName}
                          onChange={(e) => setNewSubject({ ...newSubject, shortName: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>颜色</Label>
                        <Input
                          type="color"
                          value={newSubject.color}
                          onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                          className="mt-2 h-10"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="requiresLab"
                          checked={newSubject.requiresLab}
                          onCheckedChange={(checked) => setNewSubject({ ...newSubject, requiresLab: !!checked })}
                        />
                        <Label htmlFor="requiresLab" className="cursor-pointer">需要实验班</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowSubjectDialog(false)}>取消</Button>
                      <Button onClick={addSubject} className="bg-primary hover:bg-purple-700">添加</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {subjects.map((subject) => (
                <Card key={subject.id} className="p-4 bg-white border-2 hover:border-primary transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white text-sm"
                        style={{ backgroundColor: subject.color }}
                      >
                        {subject.shortName}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{subject.name}</h4>
                        <p className="text-xs text-gray-500">{subject.shortName}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {subject.requiresLab && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      需要实验班
                    </Badge>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="space-y-6">
          {/* Toolbar */}
          <Card className="p-4 bg-white border border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜索教师姓名..."
                    value={teacherFilter}
                    onChange={(e) => setTeacherFilter(e.target.value)}
                    className="pl-10 bg-[#F9FAFB]"
                  />
                </div>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="w-40 bg-[#F9FAFB]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有科目</SelectItem>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                {selectedTeachers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">已选 {selectedTeachers.length} 位</span>
                    <Input
                      type="number"
                      placeholder="周负荷"
                      className="w-24"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = parseInt((e.target as HTMLInputElement).value);
                          if (value) bulkUpdateLoad(value);
                        }
                      }}
                    />
                  </div>
                )}
                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50">
                  <Download className="w-4 h-4 mr-2" />
                  下载模板
                </Button>
                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50">
                  <Upload className="w-4 h-4 mr-2" />
                  导入 Excel
                </Button>
                <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      添加老师
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加新老师</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>姓名</Label>
                        <Input
                          placeholder="如：张老师"
                          value={newTeacher.name}
                          onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>科目</Label>
                        <Select value={newTeacher.subjectId} onValueChange={(value) => setNewTeacher({ ...newTeacher, subjectId: value })}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="选择科目" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>周负荷（节）</Label>
                        <Input
                          type="number"
                          min="10"
                          max="35"
                          value={newTeacher.weeklyLoad}
                          onChange={(e) => setNewTeacher({ ...newTeacher, weeklyLoad: parseInt(e.target.value) })}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowTeacherDialog(false)}>取消</Button>
                      <Button onClick={addTeacher} className="bg-primary hover:bg-purple-700">添加</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </Card>

          {/* Teachers Table */}
          <Card className="p-6 bg-white border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTeachers.length === filteredTeachers.length && filteredTeachers.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTeachers(filteredTeachers.map(t => t.id));
                        } else {
                          setSelectedTeachers([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>科目</TableHead>
                  <TableHead>周负荷（节）</TableHead>
                  <TableHead>不可用时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => {
                  const subject = getSubjectById(teacher.subjectId);
                  return (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTeachers.includes(teacher.id)}
                          onCheckedChange={() => toggleTeacherSelection(teacher.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>
                        {subject && (
                          <Badge style={{ backgroundColor: subject.color + '20', color: subject.color, borderColor: subject.color }}>
                            {subject.name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="10"
                          max="35"
                          value={teacher.weeklyLoad}
                          onChange={(e) => updateTeacherLoad(teacher.id, parseInt(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setShowUnavailableDialog(true);
                          }}
                        >
                          {teacher.unavailable.length > 0 ? `${teacher.unavailable.length} 时段` : '设置'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTeacher(teacher.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Unavailable Time Dialog */}
          <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>设置不可用时间 - {selectedTeacher?.name}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600 mb-4">点击时间格标记为不可用（红色），再次点击取消标记</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="flex bg-gray-50 border-b border-gray-200">
                    <div className="w-20 p-2 text-center text-sm font-medium text-gray-700">节次</div>
                    {WEEKDAYS.slice(0, 5).map((day) => (
                      <div key={day} className="flex-1 p-2 text-center text-sm font-medium text-gray-700 border-l border-gray-200">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Grid */}
                  {PERIODS.map((period) => (
                    <div key={period} className="flex border-b border-gray-200 last:border-b-0">
                      <div className="w-20 p-2 text-center text-sm text-gray-600 bg-gray-50">第{period}节</div>
                      {WEEKDAYS.slice(0, 5).map((day, dayIndex) => (
                        <button
                          key={`${dayIndex}-${period}`}
                          className="flex-1 p-4 border-l border-gray-200 hover:bg-purple-50 transition-colors"
                        >
                          {/* Placeholder for unavailable marking logic */}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowUnavailableDialog(false)}>关闭</Button>
                <Button className="bg-primary hover:bg-purple-700">保存</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">批量生成教室</h3>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <Label className="text-sm text-gray-700 mb-2 block">前缀</Label>
                <Input
                  placeholder="如：教室、Lab-"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  className="bg-[#F9FAFB]"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-2 block">从编号</Label>
                <Input
                  type="number"
                  min="1"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(parseInt(e.target.value))}
                  className="bg-[#F9FAFB]"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-2 block">到编号</Label>
                <Input
                  type="number"
                  min="1"
                  value={bulkEnd}
                  onChange={(e) => setBulkEnd(parseInt(e.target.value))}
                  className="bg-[#F9FAFB]"
                />
              </div>
            </div>

            <Button onClick={bulkCreateRooms} className="bg-primary hover:bg-purple-700 w-full">
              <Plus className="w-4 h-4 mr-2" />
              生成 {bulkEnd - bulkStart + 1} 个教室
            </Button>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">教室列表</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {rooms.map((room) => (
                <Card key={room.id} className="p-4 bg-gray-50 border border-gray-200 hover:border-primary transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <h4 className="font-medium text-gray-900">{room.name}</h4>
                  </div>
                  {room.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {room.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <Button className="bg-primary hover:bg-purple-700" onClick={onNext}>
          确认无误，下一步
        </Button>
      </div>
    </div>
  );
}
