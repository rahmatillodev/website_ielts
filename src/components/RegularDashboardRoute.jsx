import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Helper function to check if a route is a mock test route
const isMockTestRoute = (path) => {
  return path.startsWith("/mock-test") || 
         path.startsWith("/mock-tests") || 
         path.startsWith("/mock/") || 
         path === "/mock";
}

// RegularDashboardRoute component - ONLY allows access to regular dashboard routes
// Blocks mock test users from accessing regular dashboard
export default function RegularDashboardRoute({ children }) {
  const location = useLocation()
  const authUser = useAuthStore((state) => state.authUser)
  
  // Get access mode from sessionStorage
  const accessMode = sessionStorage.getItem('accessMode')
  
  // If user is not authenticated, allow access (they'll be redirected by ProtectedRoute)
  if (!authUser) {
    // Set access mode to regular if NOT coming from mock test route
    if (!isMockTestRoute(location.pathname)) {
      sessionStorage.setItem('accessMode', 'regular')
    }
    return children
  }
  
  // Allow profile page access from both platforms
  if (location.pathname === '/profile') {
    return children
  }
  
  // If user is authenticated but in mockTest mode, block access to regular dashboard routes
  if (accessMode === 'mockTest') {
    console.log('[RegularDashboardRoute] Mock test user trying to access regular dashboard, redirecting to mock-tests')
    return <Navigate to="/mock-tests" replace />
  }
  
  // Ensure accessMode is set to regular for regular dashboard routes
  if (!isMockTestRoute(location.pathname)) {
    sessionStorage.setItem('accessMode', 'regular')
  }
  
  return children
}

