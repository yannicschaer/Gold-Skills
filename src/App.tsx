import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useContentStore } from '@/store/content'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RoleRoute } from '@/components/RoleRoute'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { MySkillsPage } from '@/pages/MySkillsPage'
import { TeamOverviewPage } from '@/pages/TeamOverviewPage'
import { MemberSkillsPage } from '@/pages/MemberSkillsPage'
import { AdminPage } from '@/pages/AdminPage'
import { TeamCatalogPage } from '@/pages/TeamCatalogPage'
import { ManagerDashboardPage } from '@/pages/ManagerDashboardPage'
import { AdminCyclesPage } from '@/pages/AdminCyclesPage'
import { MyCyclePage } from '@/pages/MyCyclePage'

export default function App() {
  const { initialize } = useAuthStore()
  const { fetchAppSettings } = useContentStore()

  useEffect(() => {
    initialize()
    fetchAppSettings()
  }, [initialize, fetchAppSettings])

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
          <Route
            path="/skills"
            element={
              <RoleRoute allowedRoles={['admin', 'designer']} redirectTo="/">
                <MySkillsPage />
              </RoleRoute>
            }
          />
          <Route path="/team" element={<TeamOverviewPage />} />
          <Route path="/team/:userId" element={<MemberSkillsPage />} />
          <Route path="/manager" element={<ManagerDashboardPage />} />
          <Route
            path="/cycle"
            element={
              <RoleRoute allowedRoles={['admin', 'designer']} redirectTo="/">
                <MyCyclePage />
              </RoleRoute>
            }
          />
          <Route
            path="/skills/catalog"
            element={
              <RoleRoute allowedRoles={['admin', 'operations']} redirectTo="/skills">
                <TeamCatalogPage />
              </RoleRoute>
            }
          />
          <Route
            path="/skills/catalog/:teamId"
            element={
              <RoleRoute allowedRoles={['admin', 'operations']} redirectTo="/skills">
                <TeamCatalogPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={['admin']} redirectTo="/">
                <AdminPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/cycles"
            element={
              <RoleRoute allowedRoles={['admin']} redirectTo="/">
                <AdminCyclesPage />
              </RoleRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
