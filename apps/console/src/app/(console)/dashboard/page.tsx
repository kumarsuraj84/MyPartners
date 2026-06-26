'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatDistanceToNow, format } from 'date-fns'
import { PageHeader, StatCard, Table, Th, Td, Badge, LoadingRows, EmptyRow, duration } from '@/components/ui'

interface Overview {
  totalUsers: number; totalMessages: number; totalTasks: number; totalJobs: number
  totalIntegrations: number; activeIntegrations: number
  jobsToday: number; jobErrorsToday: number; messagesProcessedToday: number; errorRateToday: number
  recentJobs: Array<{
    id: string; type: string; status: string; error?: string
    createdAt: string; startedAt?: string; completedAt?: string
    user: { email: string; name: string }
  }>
}

interface Health { status: string; db: string; timestamp: string }

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery<Overview>({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get('/api/admin/overview'),
    refetchInterval: 15_000,
  })

  const { data: health } = useQuery<Health>({
    queryKey: ['health', 'ready'],
    queryFn: () => api.get('/health/ready'),
    refetchInterval: 30_000,
    retry: false,
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Dashboard" subtitle="Live operational overview" />

      {/* Health strip */}
      <div className="flex items-center gap-3 bg-white border border-zinc-200 px-4 py-2.5 text-xs">
        <span className="text-zinc-400 font-medium">Platform</span>
        <HealthChip label="API" ok={true} />
        <HealthChip label="Database" ok={health?.db === 'ok'} />
        <HealthChip label="Ready" ok={health?.status === 'ready'} />
        {health?.timestamp && (
          <span className="ml-auto text-zinc-300 font-mono text-[10px]">
            checked {formatDistanceToNow(new Date(health.timestamp))} ago
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Total Users" value={overview?.totalUsers ?? '—'} />
        <StatCard label="Active Integrations" value={overview?.activeIntegrations ?? '—'} sub={`of ${overview?.totalIntegrations ?? '—'} total`} />
        <StatCard label="Processed Today" value={overview?.messagesProcessedToday ?? '—'} sub="messages" />
        <StatCard label="Jobs Today" value={overview?.jobsToday ?? '—'} />
        <StatCard
          label="Error Rate"
          value={overview ? `${overview.errorRateToday}%` : '—'}
          color={overview && overview.errorRateToday > 10 ? 'red' : overview && overview.errorRateToday > 0 ? 'yellow' : 'green'}
        />
      </div>

      {/* More stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Messages" value={overview?.totalMessages ?? '—'} />
        <StatCard label="Total Tasks" value={overview?.totalTasks ?? '—'} />
        <StatCard label="Total AI Jobs" value={overview?.totalJobs ?? '—'} />
        <StatCard label="Failed Today" value={overview?.jobErrorsToday ?? '—'} color={overview && overview.jobErrorsToday > 0 ? 'red' : undefined} />
      </div>

      {/* Recent jobs */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Recent Activity</p>
        <Table>
          <thead>
            <tr>
              <Th>Time</Th>
              <Th>User</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th right>Duration</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <LoadingRows cols={5} />}
            {!isLoading && !overview?.recentJobs.length && <EmptyRow cols={5} message="No jobs yet" />}
            {overview?.recentJobs.map(job => (
              <tr key={job.id} className="hover:bg-zinc-50">
                <Td muted mono>{format(new Date(job.createdAt), 'HH:mm:ss')}</Td>
                <Td>{job.user.email}</Td>
                <Td muted>{job.type.replace(/_/g, ' ')}</Td>
                <Td><Badge label={job.status} /></Td>
                <Td right mono>{duration(job.startedAt, job.completedAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  )
}

function HealthChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] border ${ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      {label}
    </span>
  )
}
