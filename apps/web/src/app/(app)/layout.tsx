'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { ErrorBoundary } from '@/components/error-boundary'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-auto">
        <div className="max-w-4xl mx-auto px-10 py-9">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
