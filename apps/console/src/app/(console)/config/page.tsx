'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { PageHeader, Table, Th, Td, EmptyRow, LoadingRows } from '@/components/ui'

interface ConfigEntry { tenantId: string; email: string; key: string; value: string; isDefault: boolean }
interface ConfigRes { configs: ConfigEntry[] }

export default function ConfigPage() {
  const [filterTenant, setFilterTenant] = useState('')
  const [filterKey, setFilterKey] = useState('')
  const [showDefaults, setShowDefaults] = useState(true)

  const { data, isLoading } = useQuery<ConfigRes>({
    queryKey: ['admin', 'config'],
    queryFn: () => api.get('/api/admin/config'),
  })

  const configs = data?.configs ?? []
  const tenants = [...new Set(configs.map(c => c.tenantId))]
  const keys = [...new Set(configs.map(c => c.key))]

  const filtered = configs.filter(c => {
    if (filterTenant && c.tenantId !== filterTenant) return false
    if (filterKey && c.key !== filterKey) return false
    if (!showDefaults && c.isDefault) return false
    return true
  })

  const overrideCount = configs.filter(c => !c.isDefault).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuration Explorer"
        subtitle={`${configs.length} config entries · ${overrideCount} tenant overrides`}
      />

      <div className="flex items-center gap-2">
        <select
          value={filterTenant}
          onChange={e => setFilterTenant(e.target.value)}
          className="text-xs border border-zinc-200 px-2 py-1.5 bg-white"
        >
          <option value="">All tenants</option>
          {tenants.map(t => <option key={t}>{t}</option>)}
        </select>
        <select
          value={filterKey}
          onChange={e => setFilterKey(e.target.value)}
          className="text-xs border border-zinc-200 px-2 py-1.5 bg-white"
        >
          <option value="">All keys</option>
          {keys.map(k => <option key={k}>{k}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showDefaults}
            onChange={e => setShowDefaults(e.target.checked)}
            className="h-3 w-3"
          />
          Show defaults
        </label>
        {(filterTenant || filterKey) && (
          <button
            onClick={() => { setFilterTenant(''); setFilterKey('') }}
            className="text-xs text-zinc-400 hover:text-zinc-700"
          >
            Clear
          </button>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Tenant</Th>
            <Th>Key</Th>
            <Th>Value</Th>
            <Th>Source</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <LoadingRows cols={4} />}
          {!isLoading && !filtered.length && <EmptyRow cols={4} message="No config entries match filters" />}
          {filtered.map((c, i) => (
            <tr key={`${c.tenantId}-${c.key}-${i}`} className="hover:bg-zinc-50">
              <Td mono muted>{c.email || c.tenantId.slice(0, 12) + '…'}</Td>
              <Td mono>{c.key}</Td>
              <Td>
                <span className="font-mono text-[11px] text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded-sm">
                  {String(c.value).length > 60 ? String(c.value).slice(0, 60) + '…' : String(c.value)}
                </span>
              </Td>
              <Td>
                <span className={`text-[10px] font-medium ${c.isDefault ? 'text-zinc-400' : 'text-blue-600'}`}>
                  {c.isDefault ? 'default' : 'override'}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
