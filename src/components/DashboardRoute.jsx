import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { isMockTestRoute } from '@/lib/routeContext'

// Dashboard Route component - allows access to public pages
// For public pages, we don't need to redirect based on auth status
export default function DashboardRoute({ children }) {
  const location = useLocation()
  const authUser = useAuthStore((state) => state.authUser)

  // Don't redirect if user is on mock test routes
  if (isMockTestRoute(location.pathname)) {
    return children
  }

  // Allow password reset flow even when user has a session (e.g. recovery link)
  if (location.pathname === '/forgot-password' || location.pathname === '/reset-password') {
    return children
  }

  // Mock routes already returned above, so there is no stored mode left to
  // consult here - a signed-in user landing on a public page goes to the
  // dashboard, and reaches mock tests from the sidebar.

  // Only redirect if user is authenticated AND not already on dashboard
  if (authUser && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" replace />
  }

  // Allow access to public pages regardless of auth status
  return children
}
