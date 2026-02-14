import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Helper function to check if a route is a mock test route
const isMockTestRoute = (path) => {
  return path.startsWith("/mock-test") || 
         path.startsWith("/mock-tests") || 
         path.startsWith("/mock/") || 
         path === "/mock";
}

// MockTestRoute component - ONLY allows access to mock test routes
// Blocks regular users from accessing mock test platform
export default function MockTestRoute({ children }) {
  const location = useLocation()
  const authUser = useAuthStore((state) => state.authUser)
  
  // Get access mode from sessionStorage
  const accessMode = sessionStorage.getItem('accessMode')
  
  // If user is not authenticated, allow access (they'll be redirected by ProtectedRoute)
  if (!authUser) {
    // Set access mode to mockTest if coming from mock test route
    if (isMockTestRoute(location.pathname)) {
      sessionStorage.setItem('accessMode', 'mockTest')
    }
    return children
  }
  
  // Allow profile page access from both platforms
  if (location.pathname === '/profile') {
    return children
  }
  
  // If user is authenticated but in regular mode, block access to mock test routes
  if (accessMode === 'regular') {
    console.log('[MockTestRoute] Regular user trying to access mock test route, redirecting to dashboard')
    return <Navigate to="/dashboard" replace />
  }
  
  // Ensure accessMode is set to mockTest for mock test routes
  if (isMockTestRoute(location.pathname)) {
    sessionStorage.setItem('accessMode', 'mockTest')
  }
  
  return children
}

