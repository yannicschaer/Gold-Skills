import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from './Sidebar'
import { CaretRight } from '@phosphor-icons/react'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/skills', label: 'Skills Matrix', requireEdit: true },
  { to: '/team', label: 'Team Skills' },
  { to: '/admin', label: 'Admin', requireAdmin: true },
]

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/skills': 'Skills Matrix',
  '/team': 'Team Skills',
  '/admin': 'Admin',
}

export function Layout() {
  const { profile, isAdmin, canEditSkills } = useAuthStore()
  const location = useLocation()

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.requireAdmin && !isAdmin) return false
    if (item.requireEdit && !canEditSkills) return false
    return true
  })

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Gold Skills'
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() ?? ''

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 bg-sand-50">
        {/* Topbar */}
        <header className="flex items-center justify-between bg-white border-b border-sand-200 px-[32px] h-[64px]">
          <div className="flex items-center gap-[8px]">
            {location.pathname !== '/' && (
              <>
                <Link to="/" className="font-body text-[14px] text-neutral-500 hover:text-forest-950 transition-colors">
                  Home
                </Link>
                <CaretRight size={16} className="text-neutral-400" />
              </>
            )}
            <span className="font-body text-[14px] font-semibold text-forest-950">
              {pageTitle}
            </span>
          </div>
          <div className="flex items-center gap-[16px]">
            <img src="/icons/search.svg" alt="Suche" className="size-[20px] opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />
            <img src="/icons/bell.svg" alt="Benachrichtigungen" className="size-[20px] opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />
            <img src="/icons/gear.svg" alt="Einstellungen" className="size-[20px] opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />
            <div className="flex items-center justify-center size-[32px] rounded-full bg-forest-950">
              <span className="font-body text-[12px] leading-[1.5] tracking-[0.2px] text-white">{initials}</span>
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex md:hidden items-center gap-[4px] bg-white border-b border-sand-200 px-[16px] py-[8px] overflow-x-auto">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 px-[12px] py-[8px] rounded-[8px] font-body text-[14px] font-semibold ${
                  isActive
                    ? 'bg-forest-950 text-white'
                    : 'text-neutral-600 hover:bg-sand-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-auto p-[32px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
