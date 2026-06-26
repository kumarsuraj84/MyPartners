'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { PageHeader, Table, Th, Td, Badge, LoadingRows, EmptyRow } from '@/components/ui'

interface FlagRow { tenantId: string; email: string; flag: string; value: boolean; isOverride: boolean }
interface FlagsRes { defaults: Record<string, boolean>; overrides: FlagRow[] }

export default function FlagsPage() {
  const qc = useQueryClient()
  const [filterTenant, setFilterTenant] = useState('')

  const { data, isLoading } = useQuery<FlagsRes>({
    queryKey: ['admin', 'flags'],
    queryFn: () => api.get('/api/admin/flags'),
  })

  const toggle = useMutation({
    mutationFn: ({ tenantId, flag, value }: { tenantId: string; flag: string; value: boolean }) =>
      api.put(`/api/admin/flags/${tenantId}/${flag}`, { value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flags'] }),
  })

  const defaults = data?.defaults ?? {}
  const overrides = data?.overrides ?? []

  const tenants = [...new Set(overrides.map(o => o.tenantId))]
  const filtered = filterTenant ? overrides.filter(o => o.tenantId === filterTenant) : overrides

  return (
    <div className="space-y-5">
      <PageHeader title="Feature Flags" subtitle="Platform-wide defaults and per-tenant overrides" />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Global Defaults</p>
        <Table>
          <thead>
            <tr>
              <Th>Flag</Th>
              <Th>Default Value</Th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(defaults).length === 0 && !isLoading && (
              <EmptyRow cols={2} message="No flags defined" />
            )}
            {Object.entries(defaults).map(([flag, value]) => (
              <tr key={flag} className="hover:bg-zinc-50">
                <Td mono>{flag}</Td>
                <Td><Badge label={value ? 'enabled' : 'disabled'} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Per-Tenant Overrides</p>
          <div className="flex items-center gap-2">
            <select
              value={filterTenant}
              onChange={e => setFilterTenant(e.target.value)}
              className="text-xs border border-zinc-200 px-2 py-1.5 bg-white"
            >
              <option value="">All tenants</option>
              {tenants.map(t => <option key={t}>{t}</option>)}
            </select>
            {filterTenant && (
              <button onClick={() => setFilterTenant('')} className="text-xs text-zinc-400 hover:text-zinc-700">Clear</button>
            )}
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Tenant</Th>
              <Th>Flag</Th>
              <Th>Value</Th>
              <Th>Toggle</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <LoadingRows cols={4} />}
            {!isLoading && !filtered.length && <EmptyRow cols={4} message="No overrides" />}
            {filtered.map(row => (
              <tr key={`${row.tenantId}-${row.flag}`} className="hover:bg-zinc-50">
                <Td mono muted>{row.tenantId.slice(0, 12)}…</Td>
                <Td mono>{row.flag}</Td>
                <Td><Badge label={row.value ? 'enabled' : 'disabled'} /></Td>
                <Td>
                  <button
                    onClick={() => toggle.mutate({ tenantId: row.tenantId, flag: row.flag, value: !row.value })}
                    className="text-xs text-zinc-500 hover:text-zinc-900 underline"
                    disabled={toggle.isPending}
                  >
                    {row.value ? 'Disable' : 'Enable'}
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  )
}
