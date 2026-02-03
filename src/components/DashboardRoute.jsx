import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Dashboard Route component - allows access to public pages
// For public pages, we don't need to redirect based on auth status
export default function DashboardRoute({ children }) {
  const location = useLocation()
  const authUser = useAuthStore((state) => state.authUser)

  // Only redirect if user is authenticated AND not already on dashboard
  if (authUser && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" replace />
  }

  // Allow access to public pages regardless of auth status
  return children
}
