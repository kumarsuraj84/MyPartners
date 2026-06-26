'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader, Table, Th, Td, Badge, LoadingRows, EmptyRow } from '@/components/ui'

interface AuditEntry {
  id: string; tenantId: string; userId: string; action: string; entity: string
  entityId?: string; before?: unknown; after?: unknown; metadata?: unknown; createdAt: string
}
interface AuditRes { logs: AuditEntry[]; nextCursor: string | null }

const ACTIONS = ['created','updated','deleted','connected','disconnected','synced','config_changed','role_changed','plan_changed','dismissed','completed','approved']
const ENTITIES = ['user','integration','task','message','config','ai_provider','feature_flag','signal']

export default function AuditPage() {
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [cursor, setCursor] = useState<string | undefined>()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery<AuditRes>({
    queryKey: ['admin', 'audit', filterAction, filterEntity, cursor],
    queryFn: () => api.get(
      `/api/admin/audit?limit=50${filterAction ? `&action=${filterAction}` : ''}${filterEntity ? `&entity=${filterEntity}` : ''}${cursor ? `&cursor=${cursor}` : ''}`
    ),
  })

  const logs = data?.logs ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Explorer" subtitle="All platform events across all tenants" />

      <div className="flex items-center gap-2">
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setCursor(undefined) }} className="text-xs border border-zinc-200 px-2 py-1.5 bg-white">
          <option value="">All actions</option>
          {ACTIONS.map(a => <option key={a}>{a}</option>)}
        </select>
        <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setCursor(undefined) }} className="text-xs border border-zinc-200 px-2 py-1.5 bg-white">
          <option value="">All entities</option>
          {ENTITIES.map(e => <option key={e}>{e}</option>)}
        </select>
        {(filterAction || filterEntity) && (
          <button onClick={() => { setFilterAction(''); setFilterEntity(''); setCursor(undefined) }} className="text-xs text-zinc-400 hover:text-zinc-700">
            Clear
          </button>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th></Th>
            <Th>Timestamp</Th>
            <Th>User ID</Th>
            <Th>Action</Th>
            <Th>Entity</Th>
            <Th>Entity ID</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <LoadingRows cols={6} />}
          {!isLoading && !logs.length && <EmptyRow cols={6} message="No audit events found" />}
          {logs.map(log => (
            <>
              <tr
                key={log.id}
                className="hover:bg-zinc-50 cursor-pointer"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                <Td>
                  {log.before || log.after
                    ? expanded === log.id
                      ? <ChevronDown className="h-3 w-3 text-zinc-400" />
                      : <ChevronRight className="h-3 w-3 text-zinc-400" />
                    : <span className="h-3 w-3 block" />
                  }
                </Td>
                <Td mono muted>{format(new Date(log.createdAt), 'MMM d HH:mm:ss')}</Td>
                <Td mono muted>{log.userId.slice(0, 8)}…</Td>
                <Td><Badge label={log.action} /></Td>
                <Td muted>{log.entity}</Td>
                <Td mono muted>{log.entityId ? log.entityId.slice(0, 12) + '…' : '—'}</Td>
              </tr>
              {expanded === log.id && (log.before || log.after) && (
                <tr key={`${log.id}-detail`}>
                  <td colSpan={6} className="px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                    <div className="grid grid-cols-2 gap-3">
                      {log.before && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Before</p>
                          <pre className="text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 p-2 overflow-auto max-h-32">
                            {JSON.stringify(log.before, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.after && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">After</p>
                          <pre className="text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 p-2 overflow-auto max-h-32">
                            {JSON.stringify(log.after, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </Table>

      {data?.nextCursor && (
        <button
          onClick={() => setCursor(data.nextCursor ?? undefined)}
          className="text-xs text-zinc-500 hover:text-zinc-900 underline"
        >
          Load more
        </button>
      )}
    </div>
  )
}
