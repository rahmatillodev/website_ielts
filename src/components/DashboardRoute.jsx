import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Admin Route component that checks authentication and admin role
export default function DashboardRoute({ children }) {
  const userProfile = useAuthStore((state) => state.userProfile)
  
  const loading = useAuthStore((state) => state.loading)

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to dashboard if not admin
  if (userProfile !== null) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
