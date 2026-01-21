import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card } from './ui/card';
import { Plus, X, Coffee, Utensils, Copy, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Break {
  id: string;
  name: string;
  duration: number;
  isHard: boolean;
  afterPeriod: number;
}

interface PeriodTime {
  period: number;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  [key: number]: PeriodTime[];
}

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function TimeGridSetup({ onNext }: { onNext?: () => void }) {
  const [workDays, setWorkDays] = useState(5);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [breaks, setBreaks] = useState<Break[]>([
    { id: '1', name: '大课间', duration: 20, isHard: true, afterPeriod: 2 },
    { id: '2', name: '午餐', duration: 60, isHard: true, afterPeriod: 4 },
  ]);
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [newBreak, setNewBreak] = useState({ name: '', duration: 10, isHard: false, afterPeriod: 1 });
  
  // Time settings for each day
  const [daySchedules, setDaySchedules] = useState<DaySchedule>(() => {
    const initial: DaySchedule = {};
    for (let day = 0; day < 7; day++) {
      initial[day] = Array.from({ length: 8 }, (_, i) => ({
        period: i + 1,
        startTime: `${8 + Math.floor(i * 0.75)}:${(i % 2) * 30 < 10 ? '0' : ''}${(i % 2) * 30}`,
        endTime: `${8 + Math.floor((i + 1) * 0.75)}:${((i + 1) % 2) * 30 < 10 ? '0' : ''}${((i + 1) % 2) * 30}`,
      }));
    }
    return initial;
  });

  const [selectedDay, setSelectedDay] = useState(0);
  const [editingPeriod, setEditingPeriod] = useState<number | null>(null);

  const addBreak = () => {
    if (newBreak.name && newBreak.afterPeriod > 0 && newBreak.afterPeriod <= periodsPerDay) {
      setBreaks([...breaks, { ...newBreak, id: Date.now().toString() }]);
      setNewBreak({ name: '', duration: 10, isHard: false, afterPeriod: 1 });
      setShowBreakForm(false);
    }
  };

  const removeBreak = (id: string) => {
    setBreaks(breaks.filter(b => b.id !== id));
  };

  const getBreakAfterPeriod = (period: number) => {
    return breaks.find(b => b.afterPeriod === period);
  };

  const updatePeriodTime = (day: number, period: number, field: 'startTime' | 'endTime', value: string) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: prev[day].map(p => 
        p.period === period ? { ...p, [field]: value } : p
      ),
    }));
  };

  const applyToOtherDays = (sourceDay: number, targetDays: number[]) => {
    setDaySchedules(prev => {
      const updated = { ...prev };
      const sourceSchedule = prev[sourceDay];
      targetDays.forEach(day => {
        updated[day] = sourceSchedule.map(p => ({ ...p }));
      });
      return updated;
    });
  };

  return (
    <div className="p-8">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">第一步：规划学校时间</h1>
        <p className="text-gray-600">定义全校课表的时间框架，这将作为所有班级排课的基础画布</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Parameters */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">参数设置</h3>
            
            <div className="space-y-6">
              {/* Work Days */}
              <div>
                <Label htmlFor="workDays" className="text-gray-700 mb-2 block">每周工作天数</Label>
                <Select value={workDays.toString()} onValueChange={(v) => setWorkDays(parseFloat(v))}>
                  <SelectTrigger className="bg-[#F9FAFB]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 天</SelectItem>
                    <SelectItem value="5.5">5.5 天</SelectItem>
                    <SelectItem value="6">6 天</SelectItem>
                    <SelectItem value="7">7 天</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Periods Per Day */}
              <div>
                <Label htmlFor="periodsPerDay" className="text-gray-700 mb-2 block">每日最大课节数</Label>
                <Input
                  id="periodsPerDay"
                  type="number"
                  min="6"
                  max="12"
                  value={periodsPerDay}
                  onChange={(e) => setPeriodsPerDay(parseInt(e.target.value))}
                  className="bg-[#F9FAFB] border-gray-200"
                />
              </div>

              {/* Break Definition */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-700">时间块定义</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBreakForm(!showBreakForm)}
                    className="text-primary border-primary hover:bg-purple-50"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加
                  </Button>
                </div>

                {/* Existing Breaks */}
                <div className="space-y-2 mb-4">
                  {breaks.map((breakItem) => (
                    <div key={breakItem.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2">
                        {breakItem.name.includes('午') ? (
                          <Utensils className="w-4 h-4 text-primary" />
                        ) : (
                          <Coffee className="w-4 h-4 text-primary" />
                        )}
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{breakItem.name}</div>
                          <div className="text-xs text-gray-600">
                            第{breakItem.afterPeriod}节后 · {breakItem.duration}分钟
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBreak(breakItem.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add Break Form */}
                {showBreakForm && (
                  <Card className="p-4 bg-gray-50 border border-gray-200">
                    <div className="space-y-3">
                      <Input
                        placeholder="名称（如：大课间、午餐）"
                        value={newBreak.name}
                        onChange={(e) => setNewBreak({ ...newBreak, name: e.target.value })}
                        className="bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="时长"
                          min="5"
                          max="120"
                          value={newBreak.duration}
                          onChange={(e) => setNewBreak({ ...newBreak, duration: parseInt(e.target.value) })}
                          className="bg-white"
                        />
                        <Input
                          type="number"
                          placeholder="第几节后"
                          min="1"
                          max={periodsPerDay}
                          value={newBreak.afterPeriod}
                          onChange={(e) => setNewBreak({ ...newBreak, afterPeriod: parseInt(e.target.value) })}
                          className="bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="isHard"
                          checked={newBreak.isHard}
                          onCheckedChange={(checked) => setNewBreak({ ...newBreak, isHard: checked })}
                        />
                        <Label htmlFor="isHard" className="text-sm cursor-pointer">
                          硬性断点
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowBreakForm(false)} className="flex-1">
                          取消
                        </Button>
                        <Button size="sm" onClick={addBreak} className="flex-1 bg-primary hover:bg-purple-700">
                          添加
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    已检测到 <strong>{breaks.filter(b => b.isHard).length}</strong> 个硬性断点
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Time Setting Card */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">时间设置</h3>
              <Clock className="w-5 h-5 text-primary" />
            </div>
            
            <div className="mb-4">
              <Label className="text-gray-700 mb-2 block">选择日期模板</Label>
              <Select value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(parseInt(v))}>
                <SelectTrigger className="bg-[#F9FAFB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.slice(0, Math.ceil(workDays)).map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {daySchedules[selectedDay]?.slice(0, periodsPerDay).map((period) => (
                <div key={period.period} className="p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">第 {period.period} 节</div>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={period.startTime}
                      onChange={(e) => updatePeriodTime(selectedDay, period.period, 'startTime', e.target.value)}
                      className="bg-white text-sm h-8"
                    />
                    <span className="text-gray-400 self-center">-</span>
                    <Input
                      type="time"
                      value={period.endTime}
                      onChange={(e) => updatePeriodTime(selectedDay, period.period, 'endTime', e.target.value)}
                      className="bg-white text-sm h-8"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full mt-4 text-primary border-primary hover:bg-purple-50"
              onClick={() => {
                const otherDays = Array.from({ length: Math.ceil(workDays) }, (_, i) => i).filter(d => d !== selectedDay);
                applyToOtherDays(selectedDay, otherDays);
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              应用到所有其他日
            </Button>
          </Card>
        </div>

        {/* Right Side - 2D Grid Preview */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">交互式预览时间表</h3>
            
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Header */}
                <div className="flex gap-1 mb-1">
                  <div className="w-20 flex-shrink-0"></div>
                  {WEEKDAYS.slice(0, Math.ceil(workDays)).map((day, index) => (
                    <div key={index} className="flex-1 min-w-[100px] text-center font-semibold text-gray-700 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="space-y-1">
                  {Array.from({ length: periodsPerDay }, (_, periodIndex) => {
                    const period = periodIndex + 1;
                    const breakAfter = getBreakAfterPeriod(period);
                    
                    return (
                      <div key={period}>
                        {/* Period Row */}
                        <div className="flex gap-1">
                          <div className="w-20 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded text-sm font-medium text-gray-700">
                            第{period}节
                          </div>
                          {Array.from({ length: Math.ceil(workDays) }, (_, dayIndex) => {
                            const schedule = daySchedules[dayIndex]?.[periodIndex];
                            return (
                              <div
                                key={dayIndex}
                                className="flex-1 min-w-[100px] p-2 bg-gradient-to-br from-purple-50 to-purple-100 rounded border border-purple-200 hover:border-primary transition-colors"
                              >
                                <div className="text-xs text-gray-600 text-center">
                                  {schedule?.startTime} - {schedule?.endTime}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Break Row */}
                        {breakAfter && (
                          <div className="flex gap-1 my-2">
                            <div className={`w-20 flex-shrink-0 flex items-center justify-center rounded text-xs font-medium ${
                              breakAfter.isHard ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {breakAfter.isHard ? '🚫' : '☕'}
                            </div>
                            {Array.from({ length: Math.ceil(workDays) }, (_, dayIndex) => (
                              <div
                                key={dayIndex}
                                className={`flex-1 min-w-[100px] p-2 rounded border-2 border-dashed ${
                                  breakAfter.isHard
                                    ? 'bg-orange-50 border-orange-300'
                                    : 'bg-green-50 border-green-300'
                                }`}
                              >
                                <div className="text-xs font-medium text-gray-900 text-center">
                                  {breakAfter.name}
                                </div>
                                <div className="text-xs text-gray-600 text-center">
                                  {breakAfter.duration}分钟
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-gray-900 mb-2">时间框架总结</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">工作日：</span>
                  <span className="ml-2 font-medium text-gray-900">{workDays} 天/周</span>
                </div>
                <div>
                  <span className="text-gray-600">每日课节：</span>
                  <span className="ml-2 font-medium text-gray-900">{periodsPerDay} 节</span>
                </div>
                <div>
                  <span className="text-gray-600">总课时：</span>
                  <span className="ml-2 font-medium text-gray-900">{workDays * periodsPerDay} 节/周</span>
                </div>
                <div>
                  <span className="text-gray-600">硬性断点：</span>
                  <span className="ml-2 font-medium text-gray-900">{breaks.filter(b => b.isHard).length} 个</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" disabled className="text-gray-400">
          上一步
        </Button>
        <Button className="bg-primary hover:bg-purple-700" onClick={onNext}>
          保存并前往下一步
        </Button>
      </div>
    </div>
  );
}
