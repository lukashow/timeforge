import { Icon } from '@iconify/react'
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
    <div className="bg-white/50 backdrop-blur-sm px-8 py-6 mb-8 rounded-[20px] shadow-sm mx-8 mt-6 border border-white">
      <div className="max-w-6xl mx-auto">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(138,86,172,0.5)]"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step) => {
              const isCompleted = step.number < currentStep
              const isCurrent = step.number === currentStep
              const isClickable = true  // All steps are clickable

              return (
                <button
                  key={step.number}
                  onClick={() => onStepClick?.(step.number)}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  {/* Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all border-4 ${
                      isCompleted
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
                        : isCurrent
                        ? 'bg-white border-primary text-primary shadow-xl shadow-primary/40 scale-110'
                        : 'bg-white border-muted text-muted-foreground'
                    } ${isClickable ? 'group-hover:scale-110' : ''}`}
                  >
                    {isCompleted ? (
                      <Icon icon="tabler:check" className="w-5 h-5" />
                    ) : (
                      <span className="font-bold">{step.number}</span>
                    )}
                  </div>

                  {/* Label */}
                  <div className="text-center max-w-[120px]">
                    <div
                      className={`text-sm font-bold mb-0.5 ${
                        isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
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
