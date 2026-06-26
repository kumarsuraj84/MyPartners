'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { PageHeader, Table, Th, Td, Badge, LoadingRows, EmptyRow } from '@/components/ui'

interface Connector {
  id: string; provider: string; isActive: boolean
  expiresAt?: string; createdAt: string; updatedAt: string
  user: { id: string; email: string; name: string }
}

export default function ConnectorsPage() {
  const [filterProvider, setFilterProvider] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const { data: connectors = [], isLoading } = useQuery<Connector[]>({
    queryKey: ['admin', 'connectors'],
    queryFn: () => api.get('/api/admin/connectors'),
  })

  const providers = [...new Set(connectors.map(c => c.provider))]

  const filtered = connectors.filter(c => {
    if (filterProvider && c.provider !== filterProvider) return false
    if (filterStatus === 'active' && !c.isActive) return false
    if (filterStatus === 'inactive' && c.isActive) return false
    if (filterStatus === 'expiring' && (!c.expiresAt || !isPast(new Date(c.expiresAt)))) return false
    return true
  })

  const activeCount = connectors.filter(c => c.isActive).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Connectors"
        subtitle={`${activeCount} active of ${connectors.length} total`}
      />

      <div className="flex items-center gap-2">
        <select
          value={filterProvider}
          onChange={e => setFilterProvider(e.target.value)}
          className="text-xs border border-zinc-200 px-2 py-1.5 bg-white"
        >
          <option value="">All providers</option>
          {providers.map(p => <option key={p}>{p}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-xs border border-zinc-200 px-2 py-1.5 bg-white"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expiring">Token expiring</option>
        </select>
        {(filterProvider || filterStatus) && (
          <button
            onClick={() => { setFilterProvider(''); setFilterStatus('') }}
            className="text-xs text-zinc-400 hover:text-zinc-700"
          >
            Clear
          </button>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Provider</Th>
            <Th>Status</Th>
            <Th>Token Expires</Th>
            <Th>Connected</Th>
            <Th>Last Updated</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <LoadingRows cols={6} />}
          {!isLoading && !filtered.length && <EmptyRow cols={6} message="No connectors match filters" />}
          {filtered.map(c => {
            const expired = c.expiresAt ? isPast(new Date(c.expiresAt)) : false
            return (
              <tr key={c.id} className="hover:bg-zinc-50">
                <Td>{c.user.email}</Td>
                <Td>{c.provider}</Td>
                <Td><Badge label={c.isActive ? 'active' : 'inactive'} /></Td>
                <Td>
                  {c.expiresAt ? (
                    <span className={expired ? 'text-red-600 font-medium' : 'text-zinc-500'}>
                      {expired ? 'Expired ' : ''}{formatDistanceToNow(new Date(c.expiresAt), { addSuffix: true })}
                    </span>
                  ) : <span className="text-zinc-300">—</span>}
                </Td>
                <Td muted>{format(new Date(c.createdAt), 'MMM d, yyyy')}</Td>
                <Td muted>{formatDistanceToNow(new Date(c.updatedAt))} ago</Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}
