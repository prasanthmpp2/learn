import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth.ts'

export function ProtectedRoute() {
  const location = useLocation()
  const { loading, user } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="panel-surface flex items-center gap-3 rounded-3xl px-5 py-4 text-sm text-[color:var(--muted)]">
          <LoaderCircle className="size-4 animate-spin text-[color:var(--accent)]" />
          Loading your workspace...
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
