import { TimeGridSetup } from '@/features/time-grid/TimeGridSetup'

export function TimetableStructurePage() {
  // Use the same TimeGridSetup component from the wizard (step 1)
  // Pass no-op functions since we don't have wizard navigation here
  return (
    <div className="space-y-6">
      <TimeGridSetup 
        onNext={() => {}} 
        onBack={() => {}} 
      />
    </div>
  )
}
