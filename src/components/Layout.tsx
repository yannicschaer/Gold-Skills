import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: '/icons/home.svg' },
  { to: '/skills', label: 'Meine Matrix', icon: '/icons/chart-bar.svg', requireEdit: true },
  { to: '/team', label: 'Team-Übersicht', icon: '/icons/chart-bar.svg' },
  { to: '/admin', label: 'Admin', icon: '/icons/gear.svg', requireAdmin: true },
]

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/skills': 'Meine Matrix',
  '/team': 'Team-Übersicht',
  '/admin': 'Admin',
}

export function Layout() {
  const { profile, isAdmin, canEditSkills, signOut } = useAuthStore()
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
  const roleName = profile?.role === 'admin' ? 'Admin' : profile?.role === 'designer' ? 'Designer' : 'Operations'

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col gap-[32px] w-[240px] shrink-0 bg-forest-950 px-[16px] py-[24px] overflow-clip">
        {/* Logo */}
        <div className="flex items-center pl-[8px]">
          <span className="font-body text-[18px] font-semibold leading-[1.4] text-white">
            Gold Skills
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-[4px]">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-[12px] px-[12px] py-[10px] rounded-[8px] font-body text-[16px] font-semibold leading-[1.5] transition-colors ${
                  isActive
                    ? 'bg-forest-800 text-white'
                    : 'text-sand-200 hover:bg-forest-900 hover:text-white'
                }`}
              >
                <img
                  src={item.icon}
                  alt=""
                  className="size-[20px]"
                  style={{ filter: isActive
                    ? 'brightness(0) saturate(100%) invert(73%) sepia(45%) saturate(530%) hue-rotate(96deg) brightness(97%) contrast(90%)'
                    : 'brightness(0) invert(90%)' }}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User Info */}
        <button
          onClick={signOut}
          className="flex items-center gap-[12px] pl-[8px] w-full text-left group"
        >
          <div className="flex items-center justify-center size-[32px] rounded-full bg-mint-400 shrink-0">
            <span className="font-body text-[12px] font-semibold text-forest-950">{initials}</span>
          </div>
          <div className="flex flex-col overflow-clip">
            <span className="font-body text-[12px] font-semibold leading-[1.5] tracking-[0.2px] text-white truncate">
              {profile?.full_name ?? profile?.email}
            </span>
            <span className="font-body text-[12px] leading-[1.5] text-sand-200 group-hover:text-coral-300 transition-colors">
              {roleName}
            </span>
          </div>
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 bg-sand-50">
        {/* Topbar */}
        <header className="flex items-center justify-between bg-white border-b border-sand-200 px-[32px] py-[16px]">
          <h1 className="font-heading text-[24px] font-medium leading-[1.3] text-forest-950">
            {pageTitle}
          </h1>
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
