import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../stores/useAuthStore'

// Roles that can access admin/manager-only routes. `owner` is treated as a
// superset of `admin` — grow1976 seed data uses 'owner' for the tenant
// super-user so the Ops Manager HTML (which logs in as admin@grow1976.dev)
// can drive Live Preview on the mobile side.
const ADMIN_ROLES = new Set(['owner', 'admin', 'manager'])

export default function RequireAdmin() {
  const user = useAuthStore((s) => s.user)

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
