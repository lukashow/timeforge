import { TeacherAssignment } from '@/features/assignments/TeacherAssignment'

export function AssignmentsPage() {
  // Use the same TeacherAssignment component from the wizard
  // Pass no-op functions since we don't have wizard navigation here
  return (
    <div className="space-y-6">
      <TeacherAssignment 
        onNext={() => {}} 
        onBack={() => {}} 
      />
    </div>
  )
}
