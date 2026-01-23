import { Icon } from '@iconify/react'
import type { WizardStep } from '@/types/common'
import { useTranslation } from 'react-i18next'

interface StepProgressBarProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

export function StepProgressBar({ currentStep, onStepClick }: StepProgressBarProps) {
	const { t } = useTranslation()
	const steps: WizardStep[] = [
		{ number: 1, title: t('progressbar.step_school_scheduling') },
		{ number: 2, title: t('progressbar.step_teaching_resources') },
		{ number: 3, title: t('progressbar.step_discipline_setup') },
		{ number: 4, title: t('progressbar.step_classes_setup') },
		{ number: 5, title: t('progressbar.step_teacher_assignment') },
		{ number: 6, title: t('progressbar.step_timetable_generation') },
		{ number: 7, title: t('progressbar.step_view_export_timetable') },
	]
  return (
    <div className="bg-white/50 backdrop-blur-sm px-8 py-6 mb-8 rounded-[20px] shadow-sm mx-8 mt-6 border border-white">
      <div className="max-w-6xl mx-auto">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-[calc(100%/14)] right-[calc(100%/14)] h-1 bg-muted rounded-full">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(138,86,172,0.5)]"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="relative grid grid-cols-7 w-full">
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
                        ? 'bg-primary border-primary text-white shadow-sm shadow-primary/30'
                        : isCurrent
                        ? 'bg-white border-primary text-primary shadow-md shadow-primary/40 scale-110'
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
