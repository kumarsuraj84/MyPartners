import { api } from './api'

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export async function login(email: string, name?: string): Promise<User> {
  const { token, user } = await api.post<{ token: string; user: User }>('/api/auth/login', { email, name })
  localStorage.setItem('auth_token', token)
  return user
}

export function logout() {
  localStorage.removeItem('auth_token')
  window.location.href = '/login'
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token')
}
