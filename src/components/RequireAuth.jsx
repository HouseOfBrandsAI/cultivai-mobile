import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore from '../stores/useAuthStore'

export default function RequireAuth() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const [checked, setChecked] = useState(!!user)

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchMe().finally(() => setChecked(true))
    } else {
      setChecked(true)
    }
  }, [isAuthenticated, user, fetchMe])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!checked) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    )
  }

  return <Outlet />
}
