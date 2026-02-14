import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Helper function to check if a route is a mock test route
const isMockTestRoute = (path) => {
  return path.startsWith("/mock-test") || 
         path.startsWith("/mock-tests") || 
         path.startsWith("/mock/") || 
         path === "/mock";
}

// Protected Route component that checks authentication
export default function ProtectedRoute({ children }) {
  const authUser = useAuthStore((state) => state.authUser)
  const location = useLocation()

  if (!authUser) {
    // Preserve the current route in the redirect so we can redirect back after login
    const redirectPath = location.pathname + location.search
    
    // Store access mode in sessionStorage if coming from mock test route
    const isMockRoute = isMockTestRoute(location.pathname);
    const modeToSet = isMockRoute ? 'mockTest' : 'regular';
    
    console.log('[ProtectedRoute] User not authenticated:', {
      pathname: location.pathname,
      isMockRoute,
      modeToSet,
      currentMode: sessionStorage.getItem('accessMode')
    });
    
    sessionStorage.setItem('accessMode', modeToSet);
    
    console.log('[ProtectedRoute] After setting mode:', sessionStorage.getItem('accessMode'));
    
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectPath)}`} replace />
  }

  return children
}

