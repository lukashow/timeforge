import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { LoginPage } from '@/features/auth/LoginPage'

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-lg">加载中...</div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Show router when authenticated
  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
