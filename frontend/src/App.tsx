import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { StepProgressBar } from '@/components/layout/StepProgressBar'
import { TimeGridSetup } from '@/features/time-grid/TimeGridSetup'
import { ResourceLibrary } from '@/features/resources/ResourceLibrary'
import { CurriculumDesign } from '@/features/curriculum/CurriculumDesign'
import { ClassFactory } from '@/features/classes/ClassFactory'
import { AssignmentMatrix } from '@/features/assignments/AssignmentMatrix'
import { GenerationTower } from '@/features/generation/GenerationTower'
import { TimetableExport } from '@/features/export/TimetableExport'

export default function App() {
  // Load currentStep from localStorage or default to 1
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('timetable-current-step')
    return saved ? parseInt(saved, 10) : 1
  })

  // Persist currentStep to localStorage on change
  useEffect(() => {
    localStorage.setItem('timetable-current-step', String(currentStep))
  }, [currentStep])

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 7))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleStepClick = (step: number) => {
    // Allow clicking any step directly
    setCurrentStep(step)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <TimeGridSetup onNext={handleNext} />
      case 2:
        return <ResourceLibrary onNext={handleNext} onBack={handleBack} />
      case 3:
        return <CurriculumDesign onNext={handleNext} onBack={handleBack} />
      case 4:
        return <ClassFactory onNext={handleNext} onBack={handleBack} />
      case 5:
        return <AssignmentMatrix onNext={handleNext} onBack={handleBack} />
      case 6:
        return <GenerationTower onNext={handleNext} onBack={handleBack} />
      case 7:
        return <TimetableExport onBack={handleBack} />
      default:
        return <TimeGridSetup onNext={handleNext} />
    }
  }

  return (
    <AppLayout currentStep={currentStep}>
      <StepProgressBar currentStep={currentStep} onStepClick={handleStepClick} />
      {renderStep()}
    </AppLayout>
  )
}
