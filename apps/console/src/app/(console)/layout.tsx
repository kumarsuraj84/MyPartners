'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { getToken } from '@/lib/api'

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !getToken()) router.push('/login')
  }, [isLoading, router])

  if (isLoading || !getToken()) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="h-5 w-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated && !isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900">Access denied</p>
          <p className="text-xs text-zinc-500 mt-1">Administrator role required to access this console.</p>
          <button onClick={() => { localStorage.clear(); router.push('/login') }} className="mt-4 text-xs text-zinc-500 hover:text-zinc-900 underline">
            Sign in with a different account
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      <main className="flex-1 ml-48 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
