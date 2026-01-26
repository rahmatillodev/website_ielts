import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Protected Route component that checks authentication
export default function ProtectedRoute({ children }) {
  const authUser = useAuthStore((state) => state.authUser)
  const loading = useAuthStore((state) => state.loading)
  const isInitialized = useAuthStore((state) => state.isInitialized)

  // Show loading state while checking authentication or before initialization
  if (loading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!authUser) {
    return <Navigate to="/login" replace />
  }

  return children
}

