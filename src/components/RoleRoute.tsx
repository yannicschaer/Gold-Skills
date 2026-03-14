import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import type { Profile } from '@/types/database'

interface Props {
  children: React.ReactNode
  allowedRoles: Profile['role'][]
  redirectTo?: string
}

export function RoleRoute({ children, allowedRoles, redirectTo = '/team' }: Props) {
  const { role, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
