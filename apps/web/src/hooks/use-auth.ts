'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { login as loginFn, logout as logoutFn, type User } from '@/lib/auth'

export function useAuth() {
  const qc = useQueryClient()
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get('/api/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const loginMutation = useMutation({
    mutationFn: ({ email, name }: { email: string; name?: string }) => loginFn(email, name),
    onSuccess: (user) => qc.setQueryData(['auth', 'me'], user),
  })

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    logout: logoutFn,
  }
}
