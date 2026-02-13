import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Helper function to check if a route is a mock test route
const isMockTestRoute = (path) => {
  return path.startsWith("/mock-test") || 
         path.startsWith("/mock-tests") || 
         path.startsWith("/mock/") || 
         path === "/mock";
}

// Dashboard Route component - allows access to public pages
// For public pages, we don't need to redirect based on auth status
export default function DashboardRoute({ children }) {
  const location = useLocation()
  const authUser = useAuthStore((state) => state.authUser)

  // Don't redirect if user is on mock test routes
  if (isMockTestRoute(location.pathname)) {
    return children
  }

  // Check access mode - don't redirect mock test users to dashboard
  const accessMode = sessionStorage.getItem('accessMode');
  if (authUser && accessMode === 'mockTest') {
    // User is in mock test mode, redirect to mock tests
    return <Navigate to="/mock-tests" replace />
  }

  // Only redirect if user is authenticated AND not already on dashboard
  if (authUser && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" replace />
  }

  // Allow access to public pages regardless of auth status
  return children
}
