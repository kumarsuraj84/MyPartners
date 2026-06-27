'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader, StatCard } from '@/components/ui'

interface HealthRes {
  status: string
  db: string | { status: string; latencyMs?: number }
  uptime?: number
  ai?: { status: string; provider?: string }
  memory?: { heapUsedMb: number; heapTotalMb: number }
  timestamp?: string
}

interface OverviewRes {
  users: number; connectors: number; jobs: { total: number; running: number; failed: number }
  recentErrors: { message: string; createdAt: string }[]
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full mr-2 ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
  )
}

export default function HealthPage() {
  const { data: health, isLoading: healthLoading, dataUpdatedAt } = useQuery<HealthRes>({
    queryKey: ['admin', 'health'],
    queryFn: () => api.get('/health/ready'),
    refetchInterval: 15_000,
  })

  const { data: overview } = useQuery<OverviewRes>({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get('/api/admin/overview'),
    refetchInterval: 15_000,
  })

  const dbStatus = typeof health?.db === 'object' ? health.db.status : health?.db
  const dbOk = dbStatus === 'ok'
  const aiOk = health?.ai?.status === 'ok'
  const apiOk = !healthLoading && !!health

  const uptimeHours = health?.uptime ? Math.floor(health.uptime / 3600) : 0
  const uptimeMins = health?.uptime ? Math.floor((health.uptime % 3600) / 60) : 0

  const heapPct = health?.memory
    ? Math.round((health.memory.heapUsedMb / health.memory.heapTotalMb) * 100)
    : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform Health"
        subtitle={dataUpdatedAt ? `Last checked ${new Date(dataUpdatedAt).toLocaleTimeString()}` : 'Checking…'}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="border border-zinc-200 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">API Server</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center">
              <StatusDot ok={apiOk} />
              <span className="text-zinc-700">{apiOk ? 'Healthy' : 'Unreachable'}</span>
            </div>
            {health?.uptime !== undefined && (
              <div className="text-zinc-400">Uptime {uptimeHours}h {uptimeMins}m</div>
            )}
            {health?.memory && (
              <div className="text-zinc-400">Heap {health.memory.heapUsedMb}MB / {health.memory.heapTotalMb}MB ({heapPct}%)</div>
            )}
          </div>
        </div>

        <div className="border border-zinc-200 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">Database</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center">
              <StatusDot ok={dbOk} />
              <span className="text-zinc-700">{dbOk ? 'Connected' : 'Unreachable'}</span>
            </div>
            {health?.db?.latencyMs !== undefined && (
              <div className="text-zinc-400">Latency {health.db.latencyMs}ms</div>
            )}
          </div>
        </div>

        <div className="border border-zinc-200 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">AI Provider</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center">
              <StatusDot ok={aiOk} />
              <span className="text-zinc-700">{aiOk ? 'Available' : 'Unavailable'}</span>
            </div>
            {health?.ai?.provider && (
              <div className="text-zinc-400">{health.ai.provider}</div>
            )}
          </div>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total Users" value={overview.users ?? 0} />
          <StatCard label="Connectors" value={overview.connectors ?? 0} />
          <StatCard label="Running Jobs" value={overview.jobs?.running ?? 0} color={(overview.jobs?.running ?? 0) > 0 ? 'yellow' : undefined} />
          <StatCard label="Failed Jobs" value={overview.jobs?.failed ?? 0} color={(overview.jobs?.failed ?? 0) > 0 ? 'red' : 'green'} />
        </div>
      )}

      {overview?.recentErrors && overview.recentErrors.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Recent Errors</p>
          <div className="space-y-1">
            {overview.recentErrors.map((err, i) => (
              <div key={i} className="text-xs font-mono text-red-700 bg-red-50 border border-red-200 px-3 py-1.5">
                {err.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-zinc-400">Auto-refreshes every 15 seconds.</p>
    </div>
  )
}
