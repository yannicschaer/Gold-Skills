import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

export function Layout() {
  const { profile, isAdmin, canEditSkills, signOut } = useAuthStore()
  const location = useLocation()

  const navItems = [
    ...(canEditSkills ? [{ to: '/', label: 'Meine Skills' }] : []),
    { to: '/team', label: 'Team-Übersicht' },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-gray-900">
                Gold Skills
              </span>
              <div className="flex gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === item.to
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {profile?.full_name ?? profile?.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
