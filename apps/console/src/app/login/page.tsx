'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email.trim(), name.trim() || undefined)
      if (user.role !== 'owner' && user.role !== 'administrator') {
        setError('Access denied — administrator role required.')
        return
      }
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="w-80 bg-white border border-zinc-200 p-6">
        <p className="text-xs font-bold tracking-widest uppercase text-zinc-900 mb-1">EOS Console</p>
        <p className="text-xs text-zinc-400 mb-6">Platform Administration</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full border border-zinc-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-zinc-900 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">Name <span className="text-zinc-300">(first login only)</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Optional"
              className="w-full border border-zinc-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-zinc-900 transition-colors"
            />
          </div>
          {error && <p className="text-[11px] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white text-xs py-2 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
