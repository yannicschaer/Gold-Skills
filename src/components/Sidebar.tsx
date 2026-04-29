import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import {
  House,
  ChartBar,
  Users,
  GearSix,
  CaretLeft,
  SignOut,
  ListBullets,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

type NavItem = {
  to: string
  label: string
  icon: Icon
  requireAdmin?: boolean
  requireEdit?: boolean
  requireTeamManager?: boolean
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  {
    to: '/skills',
    label: 'Skills Matrix',
    icon: ChartBar,
    requireEdit: true,
    children: [
      { to: '/team', label: 'Team Skills', icon: Users },
      { to: '/skills/catalog', label: 'Skillkatalog', icon: ListBullets, requireTeamManager: true },
    ],
  },
  { to: '/admin', label: 'Admin', icon: GearSix, requireAdmin: true },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile, isAdmin, canEditSkills, canManageTeams, signOut } = useAuthStore()
  const location = useLocation()

  const isItemAllowed = (item: NavItem) => {
    if (item.requireAdmin && !isAdmin) return false
    if (item.requireEdit && !canEditSkills) return false
    if (item.requireTeamManager && !canManageTeams) return false
    return true
  }

  const visibleNav = NAV_ITEMS.filter((item) => {
    // Show parent if it passes its own check OR if any child is visible
    if (isItemAllowed(item)) return true
    return item.children?.some(isItemAllowed) ?? false
  }).map((item) => ({
    ...item,
    children: item.children?.filter(isItemAllowed),
  }))

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (profile?.email?.slice(0, 2).toUpperCase() ?? '')

  const roleName =
    profile?.role === 'admin'
      ? 'Admin'
      : profile?.role === 'designer'
        ? 'Designer'
        : 'Operations'

  return (
    <aside
      className={`hidden md:flex flex-col bg-forest-950 py-[24px] h-screen sticky top-0 overflow-clip transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[64px] px-[12px]' : 'w-[240px] px-[16px]'
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center mb-[32px] min-h-[25px] ${
          collapsed ? 'justify-center' : 'pl-[8px]'
        }`}
      >
        <span
          className={`font-body font-semibold leading-[1.4] text-white whitespace-nowrap overflow-hidden transition-all duration-300 ${
            collapsed ? 'text-[16px] w-[24px]' : 'text-[18px]'
          }`}
        >
          {collapsed ? 'GS' : 'Gold Skills'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-[4px] overflow-y-auto min-h-0">
        {visibleNav.map((item) => {
          const isActive = location.pathname === item.to
          const hasActiveChild = item.children?.some(
            (child) =>
              location.pathname === child.to ||
              location.pathname.startsWith(child.to + '/'),
          )
          const isParentHighlighted = isActive || hasActiveChild
          const showChildren = isParentHighlighted && !collapsed && (item.children?.length ?? 0) > 0
          const IconComponent = item.icon
          // If parent page isn't accessible but children are, link to first child
          const effectiveTo =
            !isItemAllowed(item) && item.children?.length
              ? item.children[0].to
              : item.to

          return (
            <div key={item.to}>
              <Link
                to={effectiveTo}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-[12px] h-[44px] rounded-[8px] font-body text-[16px] font-semibold leading-[1.5] transition-colors ${
                  collapsed
                    ? 'justify-center px-0'
                    : 'px-[12px]'
                } ${
                  isParentHighlighted
                    ? 'bg-forest-800 text-white'
                    : 'text-sand-200 hover:bg-forest-900 hover:text-white'
                }`}
              >
                <IconComponent
                  size={20}
                  weight={isParentHighlighted ? 'fill' : 'regular'}
                  className="shrink-0"
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
              {showChildren &&
                item.children!.map((child) => {
                  const isChildActive =
                    location.pathname === child.to ||
                    location.pathname.startsWith(child.to + '/')
                  const ChildIcon = child.icon
                  return (
                    <Link
                      key={child.to}
                      to={child.to}
                      className={`flex items-center gap-[10px] h-[36px] rounded-[8px] font-body text-[14px] leading-[1.5] transition-colors pl-[44px] ${
                        isChildActive
                          ? 'font-semibold text-white'
                          : 'text-sand-300 hover:text-white'
                      }`}
                    >
                      <ChildIcon size={16} className="shrink-0" />
                      <span className="truncate">{child.label}</span>
                    </Link>
                  )
                })}
            </div>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`flex items-center gap-[12px] h-[44px] rounded-[8px] font-body text-[14px] font-semibold text-sand-200 hover:bg-forest-900 hover:text-white transition-colors mb-[12px] ${
          collapsed ? 'justify-center px-0' : 'px-[12px]'
        }`}
        title={collapsed ? 'Sidebar aufklappen' : 'Sidebar zuklappen'}
      >
        <CaretLeft
          size={20}
          className={`shrink-0 transition-transform duration-300 ${
            collapsed ? 'rotate-180' : ''
          }`}
        />
        {!collapsed && <span>Zuklappen</span>}
      </button>

      {/* User Info */}
      <button
        onClick={signOut}
        title={collapsed ? 'Abmelden' : undefined}
        className={`flex items-center gap-[12px] w-full text-left group rounded-[8px] transition-colors hover:bg-forest-900 ${
          collapsed ? 'justify-center p-[8px]' : 'pl-[8px] pr-[8px] py-[4px]'
        }`}
      >
        <div className="flex items-center justify-center size-[32px] rounded-full bg-mint-400 shrink-0">
          <span className="font-body text-[12px] font-semibold text-forest-950">
            {initials}
          </span>
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-clip flex-1 min-w-0">
            <span className="font-body text-[12px] font-semibold leading-[1.5] tracking-[0.2px] text-white truncate">
              {profile?.full_name ?? profile?.email}
            </span>
            <span className="font-body text-[12px] leading-[1.5] text-sand-200 group-hover:text-coral-300 transition-colors">
              {roleName}
            </span>
          </div>
        )}
        {!collapsed && (
          <SignOut
            size={16}
            className="shrink-0 text-sand-200 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </button>
    </aside>
  )
}
