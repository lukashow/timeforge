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
        handle: { titleKey: 'menu.dashboard' }
      },
      {
        path: 'wizard',
        element: <WizardPage />,
        handle: { titleKey: 'menu.wizard' }
      },
      {
        path: 'subjects',
        element: <SubjectsPage />,
        handle: { titleKey: 'menu.subjects' }
      },
      {
        path: 'teachers',
        element: <TeachersPage />,
        handle: { titleKey: 'menu.teachers' }
      },
      {
        path: 'classrooms',
        element: <ClassroomsPage />,
        handle: { titleKey: 'menu.classrooms' }
      },
      {
        path: 'disciplines',
        element: <DisciplinesPage />,
        handle: { titleKey: 'menu.disciplines' }
      },
      {
        path: 'assignments',
        element: <AssignmentsPage />,
        handle: { titleKey: 'menu.assignments' }
      },
      {
        path: 'timetable-structure',
        element: <TimetableStructurePage />,
        handle: { titleKey: 'menu.timetable_structure' }
      },
      {
        path: 'generation',
        element: <GenerationPage />,
        handle: { titleKey: 'menu.generation' }
      },
      {
        path: 'timetables',
        element: <TimetablesPage />,
        handle: { titleKey: 'menu.timetables' }
      },
      {
        path: 'export',
        element: <ExportPage />,
        handle: { titleKey: 'menu.export' }
      },
      {
        path: 'users',
        element: <UsersPage />,
        handle: { titleKey: 'menu.users' }
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])

