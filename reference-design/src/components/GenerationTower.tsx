import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { Zap, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface OptimizationRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  type: 'preset' | 'custom';
  condition?: string;
  action?: string;
}

interface Conflict {
  id: string;
  message: string;
  severity: 'error' | 'warning';
}

export function TimetableGeneration({ onNext, onBack }: { onNext?: () => void; onBack?: () => void }) {
  const [rules, setRules] = useState<OptimizationRule[]>([
    { id: '1', label: '减少老师空窗期', description: '尽量让老师的课程连续排列', enabled: true, type: 'preset' },
    { id: '2', label: '理科课不排在下午', description: '物理、化学优先排在上午', enabled: true, type: 'preset' },
    { id: '3', label: '体育课错开排列', description: '避免多个班级同时上体育课', enabled: true, type: 'preset' },
    { id: '4', label: '双节课优先上午', description: '连堂课优先安排在上午时段', enabled: false, type: 'preset' },
    { id: '5', label: '班导师早晨优先', description: '班导师的课表尽量排在早晨', enabled: true, type: 'preset' },
  ]);

  const [showCustomRuleForm, setShowCustomRuleForm] = useState(false);
  const [newCustomRule, setNewCustomRule] = useState({ condition: '', action: '' });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [generationComplete, setGenerationComplete] = useState(false);

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const startGeneration = () => {
    setIsGenerating(true);
    setProgress(0);
    setConflicts([]);
    setGenerationComplete(false);

    // Simulate generation process
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setGenerationComplete(true);
          
          // Simulate some conflicts
          setConflicts([
            {
              id: '1',
              message: '陈老师在初一 1 班和初一 5 班的数学课时间冲突，已自动调整到不同时段',
              severity: 'warning',
            },
            {
              id: '2',
              message: '实验室 1 在周三第 3 节被 3 个班级同时需要，已为其中 2 个班级分配其他实验室',
              severity: 'warning',
            },
          ]);
          
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const addCustomRule = () => {
    const newRule: OptimizationRule = {
      id: `custom-${Date.now()}`,
      label: '自定义规则',
      description: '自定义规则',
      enabled: true,
      type: 'custom',
      condition: newCustomRule.condition,
      action: newCustomRule.action,
    };
    setRules([...rules, newRule]);
    setShowCustomRuleForm(false);
    setNewCustomRule({ condition: '', action: '' });
  };

  return (
    <div className="p-8">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">第六步：生成课表</h1>
        <p className="text-gray-600">配置优化规则并启动智能排课引擎</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Rules */}
        <div className="lg:col-span-1">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">规则开关</h3>
            
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <Label htmlFor={`rule-${rule.id}`} className="text-sm font-medium text-gray-900 cursor-pointer flex-1">
                      {rule.label}
                    </Label>
                    <Switch
                      id={`rule-${rule.id}`}
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </div>
                  <p className="text-xs text-gray-600">{rule.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                已启用 <strong>{rules.filter(r => r.enabled).length}</strong> 条优化规则
              </p>
            </div>

            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full text-primary border-primary hover:bg-purple-50"
                onClick={() => setShowCustomRuleForm(true)}
              >
                添加自定义规则
              </Button>
            </div>

            {showCustomRuleForm && (
              <div className="mt-4">
                <Card className="p-4 bg-white border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">自定义规则</h4>
                  <div className="space-y-2">
                    <Label htmlFor="condition" className="text-sm font-medium text-gray-900">条件</Label>
                    <input
                      id="condition"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      value={newCustomRule.condition}
                      onChange={(e) => setNewCustomRule({ ...newCustomRule, condition: e.target.value })}
                    />
                    <Label htmlFor="action" className="text-sm font-medium text-gray-900">动作</Label>
                    <input
                      id="action"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      value={newCustomRule.action}
                      onChange={(e) => setNewCustomRule({ ...newCustomRule, action: e.target.value })}
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      className="mr-2"
                      onClick={() => setShowCustomRuleForm(false)}
                    >
                      取消
                    </Button>
                    <Button
                      className="bg-primary hover:bg-purple-700"
                      onClick={addCustomRule}
                      disabled={!newCustomRule.condition || !newCustomRule.action}
                    >
                      添加规则
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </Card>
        </div>

        {/* Center - Engine */}
        <div className="lg:col-span-1">
          <Card className="p-6 bg-white border border-gray-200 h-full flex flex-col items-center justify-center">
            {!isGenerating && !generationComplete && (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <Zap className="w-16 h-16 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">准备就绪</h3>
                <p className="text-gray-600 mb-6 max-w-xs mx-auto">
                  点击下方按钮启动智能排课引擎，系统将根据您的配置自动生成最优课表
                </p>
                <Button
                  onClick={startGeneration}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  开始自动编排
                </Button>
              </div>
            )}

            {isGenerating && (
              <div className="text-center w-full">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">正在生成课表...</h3>
                <p className="text-gray-600 mb-6">
                  正在尝试 {Math.floor(progress * 10000)} 种组合
                </p>
                <Progress value={progress} className="w-full mb-2" />
                <p className="text-sm text-gray-500">{Math.round(progress)}%</p>
              </div>
            )}

            {generationComplete && (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-16 h-16 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">生成完成！</h3>
                <p className="text-gray-600 mb-6">
                  课表已成功生成，检测到 {conflicts.length} 个需要注意的情况
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-1">98.5%</div>
                    <div className="text-gray-600">成功率</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">180</div>
                    <div className="text-gray-600">总课节</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right - Conflict Explainer */}
        <div className="lg:col-span-1">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">冲突解释器</h3>
            
            {conflicts.length === 0 && !generationComplete && (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无冲突</p>
                <p className="text-xs mt-1">系统将在生成过程中实时显示冲突信息</p>
              </div>
            )}

            {conflicts.length === 0 && generationComplete && (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="text-sm text-gray-700 font-medium">完美！无冲突</p>
                <p className="text-xs text-gray-500 mt-1">所有课程已成功排列</p>
              </div>
            )}

            {conflicts.length > 0 && (
              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className={`p-4 rounded-lg border ${
                      conflict.severity === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          conflict.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                        }`}
                      />
                      <p
                        className={`text-sm ${
                          conflict.severity === 'error' ? 'text-red-900' : 'text-yellow-900'
                        }`}
                      >
                        {conflict.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {generationComplete && (
              <div className="mt-6">
                <Button
                  variant="outline"
                  className="w-full text-primary border-primary hover:bg-purple-50"
                  onClick={startGeneration}
                >
                  重新生成
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <Button
          className="bg-primary hover:bg-purple-700"
          onClick={onNext}
          disabled={!generationComplete}
        >
          确认课表，下一步
        </Button>
      </div>
    </div>
  );
}