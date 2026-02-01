import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Dashboard Route component - allows access to public pages
// For public pages, we don't need to redirect based on auth status
export default function DashboardRoute({ children }) {

  const userProfile = useAuthStore((state) => state.userProfile)


  if (userProfile !== null) {
    return <Navigate to="/dashboard" replace />
  }

  // Allow access to public pages regardless of auth status
  return children
}
