const TOKEN_KEY = 'auth_token'
const USER_KEY  = 'console_user'

export const getToken  = () => typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
export const setToken  = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export const getUser   = () => { try { const s = localStorage.getItem(USER_KEY); return s ? JSON.parse(s) : null } catch { return null } }
export const setUser   = (u: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(u))
export const clearUser = () => localStorage.removeItem(USER_KEY)

export function logout() { clearToken(); clearUser() }
