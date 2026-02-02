import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Protected Route component that checks authentication
export default function ProtectedRoute({ children }) {
  const authUser = useAuthStore((state) => state.authUser)


  if (!authUser) {
    return <Navigate to="/login" replace />
  }

  return children
}

