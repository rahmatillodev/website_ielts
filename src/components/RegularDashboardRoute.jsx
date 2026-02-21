import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Helper function to check if a route is a practice page
// Practice pages should be accessible from both platforms
const isPracticePage = (path) => {
  return path.includes('/reading-practice') || 
         path.includes('/listening-practice') || 
         path.includes('/writing-practice') ||
         path.includes('/speaking-practice') ||
         path.includes('/reading-result') ||
         path.includes('/listening-result') ||
         path.includes('/speaking-result');
}

// RegularDashboardRoute component - Simple wrapper for regular dashboard routes
// Redirects are handled at the App level to prevent infinite loops
// This component just renders children - access control is in App.jsx
export default function RegularDashboardRoute({ children }) {
  const location = useLocation()
  const authUser = useAuthStore((state) => state.authUser)
  
  // If user is not authenticated, allow access (they'll be redirected by ProtectedRoute)
  if (!authUser) {
    return children
  }
  
  // All access control and redirects are handled in App.jsx
  // This component just renders the layout
  return children
}

