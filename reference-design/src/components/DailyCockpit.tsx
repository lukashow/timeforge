import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { UserX, Sparkles, Monitor, FileText, Bell, Download, CheckCircle, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface LiveClass {
  id: string;
  period: number;
  className: string;
  subject: string;
  teacher: string;
  room: string;
  status: 'ongoing' | 'substitute' | 'completed' | 'pending';
  attendanceSubmitted: boolean;
}

interface Teacher {
  id: string;
  name: string;
  subject: string;
  status: 'available' | 'teaching' | 'absent';
  currentPeriod?: number;
}

export function DailyCockpit({ onBack }: { onBack?: () => void }) {
  const [searchTeacher, setSearchTeacher] = useState('');
  const [selectedAbsentTeacher, setSelectedAbsentTeacher] = useState<string | null>(null);

  const [liveClasses] = useState<LiveClass[]>([
    { id: '1', period: 3, className: '初一 1', subject: '数学', teacher: '陈老师', room: '101', status: 'ongoing', attendanceSubmitted: true },
    { id: '2', period: 3, className: '初一 2', subject: '英语', teacher: '王老师', room: '102', status: 'ongoing', attendanceSubmitted: false },
    { id: '3', period: 3, className: '初一 3', subject: '物理', teacher: '李老师 → 张老师', room: '实验室1', status: 'substitute', attendanceSubmitted: true },
    { id: '4', period: 3, className: '初一 4', subject: '化学', teacher: '周老师', room: '实验室2', status: 'ongoing', attendanceSubmitted: true },
  ]);

  const [availableTeachers] = useState<Teacher[]>([
    { id: '1', name: '张老师', subject: '物理', status: 'available' },
    { id: '2', name: '刘老师', subject: '数学', status: 'available' },
    { id: '3', name: '赵老师', subject: '英语', status: 'available' },
  ]);

  const handleSubstitute = (teacherId: string) => {
    alert(`已安排 ${availableTeachers.find(t => t.id === teacherId)?.name} 代课`);
    setSelectedAbsentTeacher(null);
  };

  const getStatusBadge = (status: LiveClass['status']) => {
    switch (status) {
      case 'ongoing':
        return <Badge className="bg-green-100 text-green-700 border-green-200">进行中</Badge>;
      case 'substitute':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">代课中</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">已完成</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">待开始</Badge>;
    }
  };

  return (
    <div className="p-8">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">今日校园运行监控</h1>
        <p className="text-gray-600">实时监控课程状态、管理代课和考勤</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-700 mb-1">当前课节</div>
              <div className="text-2xl font-bold text-purple-900">第 3 节</div>
            </div>
            <Clock className="w-10 h-10 text-purple-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-700 mb-1">进行中课程</div>
              <div className="text-2xl font-bold text-green-900">{liveClasses.filter(c => c.status === 'ongoing').length}</div>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-orange-700 mb-1">代课中</div>
              <div className="text-2xl font-bold text-orange-900">{liveClasses.filter(c => c.status === 'substitute').length}</div>
            </div>
            <UserX className="w-10 h-10 text-orange-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-700 mb-1">考勤已提交</div>
              <div className="text-2xl font-bold text-blue-900">
                {liveClasses.filter(c => c.attendanceSubmitted).length}/{liveClasses.length}
              </div>
            </div>
            <FileText className="w-10 h-10 text-blue-600 opacity-50" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Emergency Changes */}
        <div className="lg:col-span-1">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">紧急变动</h3>

            <div className="mb-6">
              <Button className="w-full bg-red-500 hover:bg-red-600 text-white">
                <UserX className="w-4 h-4 mr-2" />
                登记老师缺席
              </Button>
            </div>

            {selectedAbsentTeacher && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="font-medium text-red-900 mb-2">受影响的课节</div>
                  <div className="space-y-2">
                    <div className="p-2 bg-white rounded text-sm">
                      <div className="font-medium text-gray-900">第 3 节 - 初一 5 班</div>
                      <div className="text-gray-600">数学 · 教室 105</div>
                    </div>
                    <div className="p-2 bg-white rounded text-sm">
                      <div className="font-medium text-gray-900">第 5 节 - 初一 6 班</div>
                      <div className="text-gray-600">数学 · 教室 106</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">智能推荐代课老师</h4>
                  <div className="space-y-2">
                    {availableTeachers.slice(0, 2).map((teacher, index) => (
                      <button
                        key={teacher.id}
                        onClick={() => handleSubstitute(teacher.id)}
                        className="w-full p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary text-white text-xs">
                              {teacher.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">{teacher.name}</div>
                            <div className="text-xs text-gray-600">
                              {teacher.subject} · 此时在校且无课
                            </div>
                          </div>
                          {index === 0 && (
                            <Badge className="bg-primary text-white text-xs">
                              <Sparkles className="w-3 h-3 mr-1 inline" />
                              推荐
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!selectedAbsentTeacher && (
              <div className="text-center py-8 text-gray-500">
                <UserX className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无缺席登记</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right - Real-time Stream */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">实时课表流</h3>
                <p className="text-sm text-gray-600">第 3 节课程状态</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Monitor className="w-4 h-4 mr-2" />
                  电子看板预览
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {liveClasses.map((cls) => (
                <Card key={cls.id} className="p-4 bg-gray-50 border-2 border-gray-200 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-semibold text-gray-900">{cls.className}</div>
                        {getStatusBadge(cls.status)}
                        {cls.attendanceSubmitted ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            考勤已交
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            考勤未交
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">科目：</span>
                          <span className="ml-1 font-medium text-gray-900">{cls.subject}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">教师：</span>
                          <span className={`ml-1 font-medium ${cls.status === 'substitute' ? 'text-orange-600' : 'text-gray-900'}`}>
                            {cls.teacher}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">教室：</span>
                          <span className="ml-1 font-medium text-gray-900">{cls.room}</span>
                        </div>
                      </div>
                    </div>

                    {!cls.attendanceSubmitted && (
                      <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50">
                        提醒提交
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Extension Modules */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Monitor className="w-6 h-6 text-primary" />
              <span className="text-sm">电子看板</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              <span className="text-sm">通知家长</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Download className="w-6 h-6 text-primary" />
              <span className="text-sm">导出报表</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" className="text-primary border-primary hover:bg-purple-50">
            保存进度
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
