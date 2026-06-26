'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, Plug, Zap, DollarSign,
  ScrollText, Flag, CreditCard, Activity, ListChecks, Settings, LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/tenants',    label: 'Tenants',     icon: Building2 },
  { href: '/users',      label: 'Users',       icon: Users },
  { href: '/connectors', label: 'Connectors',  icon: Plug },
  { href: '/ai',         label: 'AI Usage',    icon: Zap },
  { href: '/cost',       label: 'Cost',        icon: DollarSign },
  { href: '/audit',      label: 'Audit',       icon: ScrollText },
  { href: '/flags',      label: 'Flags',       icon: Flag },
  { href: '/plans',      label: 'Plans',       icon: CreditCard },
  { href: '/health',     label: 'Health',      icon: Activity },
  { href: '/jobs',       label: 'Jobs',        icon: ListChecks },
  { href: '/config',     label: 'Config',      icon: Settings },
]

export function Sidebar() {
  const path = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-screen w-48 bg-white border-r border-zinc-200 flex flex-col z-10">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-zinc-200">
        <p className="text-xs font-bold tracking-widest text-zinc-900 uppercase">EOS Console</p>
        <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">Platform Administration</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-4 py-1.5 text-xs transition-colors ${
                active
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-200">
        <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 mt-1.5 text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
