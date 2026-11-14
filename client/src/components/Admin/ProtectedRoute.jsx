import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext.jsx'
import LoadingState from '../Loading/LoadingState.jsx'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAdminAuth()

  if (loading) return <LoadingState label="Checking session..." />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return children
}
