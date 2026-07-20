import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Protected Route component that checks authentication
export default function ProtectedRoute({ children }) {
  const authUser = useAuthStore((state) => state.authUser)
  const location = useLocation()

  if (!authUser) {
    // The redirect param already records exactly where the user was headed, so
    // there is nothing to stash in sessionStorage - the login page reads it back
    // from the URL. (This component also wrote accessMode during render, which
    // is a side effect in a render path.)
    const redirectPath = location.pathname + location.search
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectPath)}`} replace />
  }

  return children
}

