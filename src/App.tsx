import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RoleRoute } from '@/components/RoleRoute'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { MySkillsPage } from '@/pages/MySkillsPage'
import { TeamOverviewPage } from '@/pages/TeamOverviewPage'
import { MemberSkillsPage } from '@/pages/MemberSkillsPage'
import { AdminPage } from '@/pages/AdminPage'

function HomePage() {
  const { canEditSkills } = useAuthStore()
  if (!canEditSkills) return <Navigate to="/team" replace />
  return <MySkillsPage />
}

export default function App() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/team" element={<TeamOverviewPage />} />
          <Route path="/team/:userId" element={<MemberSkillsPage />} />
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={['admin']} redirectTo="/team">
                <AdminPage />
              </RoleRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
