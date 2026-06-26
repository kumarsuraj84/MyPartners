'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Inbox, CheckSquare, BookOpen, Settings, Zap, LogOut
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const NAV = [
  { label: 'Home',            href: '/',                icon: LayoutDashboard },
  { label: 'Mission Control', href: '/mission-control', icon: Zap },
  { label: 'Communication',   href: '/inbox',           icon: Inbox },
  { label: 'Work',            href: '/tasks',           icon: CheckSquare },
  { label: 'Memory',          href: '/knowledge',       icon: BookOpen },
  { label: 'Settings',        href: '/settings',        icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 border-r bg-card flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold tracking-tight">MyPartners</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === href
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      {user && (
        <div className="px-2.5 py-3 border-t">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-medium truncate flex-1 min-w-0">{user.name.split(' ')[0]}</p>
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
