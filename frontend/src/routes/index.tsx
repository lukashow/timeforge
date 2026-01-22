import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

// Pages
import { DashboardPage } from '@/pages/DashboardPage'
import { WizardPage } from '@/pages/WizardPage'
import { SubjectsPage } from '@/pages/SubjectsPage'
import { TeachersPage } from '@/pages/TeachersPage'
import { ClassroomsPage } from '@/pages/ClassroomsPage'
import { DisciplinesPage } from '@/pages/DisciplinesPage'
import { AssignmentsPage } from '@/pages/AssignmentsPage'
import { TimetableStructurePage } from '@/pages/TimetableStructurePage'
import { GenerationPage } from '@/pages/GenerationPage'
import { TimetablesPage } from '@/pages/TimetablesPage'
import { ExportPage } from '@/pages/ExportPage'
import { UsersPage } from '@/pages/UsersPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'wizard',
        element: <WizardPage />,
      },
      {
        path: 'subjects',
        element: <SubjectsPage />,
      },
      {
        path: 'teachers',
        element: <TeachersPage />,
      },
      {
        path: 'classrooms',
        element: <ClassroomsPage />,
      },
      {
        path: 'disciplines',
        element: <DisciplinesPage />,
      },
      {
        path: 'assignments',
        element: <AssignmentsPage />,
      },
      {
        path: 'timetable-structure',
        element: <TimetableStructurePage />,
      },
      {
        path: 'generation',
        element: <GenerationPage />,
      },
      {
        path: 'timetables',
        element: <TimetablesPage />,
      },
      {
        path: 'export',
        element: <ExportPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])

