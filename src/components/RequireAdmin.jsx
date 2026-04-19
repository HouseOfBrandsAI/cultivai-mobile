import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../stores/useAuthStore'

export default function RequireAdmin() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
