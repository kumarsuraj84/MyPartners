'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getToken, setToken, setUser, logout as doLogout } from '@/lib/auth'

interface User { id: string; email: string; name: string; role: string; plan: string }

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me'),
    enabled: !!getToken(),
    retry: false,
  })

  const isAuthenticated = !!user
  const isAdmin = user?.role === 'owner' || user?.role === 'administrator'

  async function login(email: string, name?: string) {
    const res = await api.post<{ token: string; user: User }>('/api/auth/login', { email, name })
    setToken(res.token)
    setUser(res.user)
    return res.user
  }

  function logout() { doLogout(); window.location.href = '/login' }

  return { user, isLoading, isAuthenticated, isAdmin, login, logout }
}
