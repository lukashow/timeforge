export interface StepProps {
  onNext?: () => void
  onBack?: () => void
}

export interface WizardStep {
  number: number
  title: string
}
