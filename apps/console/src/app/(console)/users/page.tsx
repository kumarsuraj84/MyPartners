'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { PageHeader, Table, Th, Td, Badge, LoadingRows, EmptyRow } from '@/components/ui'

interface User {
  id: string; email: string; name: string; role: string; plan: string; createdAt: string
  _count: { integrations: number; messages: number }
}

const PLANS = ['free', 'starter', 'professional', 'enterprise']
const ROLES = ['owner', 'administrator', 'executive', 'manager', 'assistant']

export default function UsersPage() {
  const qc = useQueryClient()
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<string | null>(null)

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/api/admin/users'),
  })

  const setPlan = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) =>
      api.put(`/api/admin/users/${id}/plan`, { plan }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); setEditingPlan(null) },
  })

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.put(`/api/admin/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); setEditingRole(null) },
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Users" subtitle={`${users.length} registered user${users.length === 1 ? '' : 's'}`} />

      <Table>
        <thead>
          <tr>
            <Th>Email</Th>
            <Th>Name</Th>
            <Th>Role</Th>
            <Th>Plan</Th>
            <Th right>Integrations</Th>
            <Th right>Messages</Th>
            <Th>Joined</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <LoadingRows cols={7} />}
          {!isLoading && !users.length && <EmptyRow cols={7} message="No users yet" />}
          {users.map(u => (
            <tr key={u.id} className="hover:bg-zinc-50">
              <Td>{u.email}</Td>
              <Td muted>{u.name}</Td>
              <Td>
                {editingRole === u.id ? (
                  <select
                    autoFocus
                    defaultValue={u.role}
                    onBlur={() => setEditingRole(null)}
                    onChange={e => setRole.mutate({ id: u.id, role: e.target.value })}
                    className="text-xs border border-zinc-300 px-1 py-0.5 bg-white"
                  >
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                ) : (
                  <button onClick={() => setEditingRole(u.id)} className="hover:opacity-70 transition-opacity">
                    <Badge label={u.role} />
                  </button>
                )}
              </Td>
              <Td>
                {editingPlan === u.id ? (
                  <select
                    autoFocus
                    defaultValue={u.plan}
                    onBlur={() => setEditingPlan(null)}
                    onChange={e => setPlan.mutate({ id: u.id, plan: e.target.value })}
                    className="text-xs border border-zinc-300 px-1 py-0.5 bg-white"
                  >
                    {PLANS.map(p => <option key={p}>{p}</option>)}
                  </select>
                ) : (
                  <button onClick={() => setEditingPlan(u.id)} className="hover:opacity-70 transition-opacity">
                    <Badge label={u.plan} />
                  </button>
                )}
              </Td>
              <Td right mono>{u._count.integrations}</Td>
              <Td right mono>{u._count.messages.toLocaleString()}</Td>
              <Td muted>{format(new Date(u.createdAt), 'MMM d, yyyy')}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="text-[10px] text-zinc-400">Click a role or plan badge to change it inline.</p>
    </div>
  )
}
