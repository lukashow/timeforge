import { Check } from 'lucide-react'
import type { WizardStep } from '@/types/common'

interface StepProgressBarProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

const steps: WizardStep[] = [
  { number: 1, title: '规划学校时间' },
  { number: 2, title: '录入教学资源' },
  { number: 3, title: '设定学科组' },
  { number: 4, title: '创建班级' },
  { number: 5, title: '教师任课分配' },
  { number: 6, title: '生成课表' },
  { number: 7, title: '查看及导出课表' },
]

export function StepProgressBar({ currentStep, onStepClick }: StepProgressBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step) => {
              const isCompleted = step.number < currentStep
              const isCurrent = step.number === currentStep
              const isClickable = step.number <= currentStep

              return (
                <button
                  key={step.number}
                  onClick={() => isClickable && onStepClick?.(step.number)}
                  disabled={!isClickable}
                  className={`flex flex-col items-center group ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  {/* Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                      isCompleted
                        ? 'bg-primary text-white'
                        : isCurrent
                        ? 'bg-primary text-white ring-4 ring-purple-100'
                        : 'bg-gray-200 text-gray-500'
                    } ${isClickable ? 'group-hover:scale-110' : ''}`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="font-semibold">{step.number}</span>
                    )}
                  </div>

                  {/* Label */}
                  <div className="text-center max-w-[120px]">
                    <div
                      className={`text-sm font-medium mb-0.5 ${
                        isCurrent ? 'text-primary' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
