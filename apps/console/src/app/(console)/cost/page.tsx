'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader, Table, Th, Td, StatCard, EmptyRow, LoadingRows } from '@/components/ui'

interface Job { id: string; type: string; status: string; startedAt?: string; completedAt?: string; user: { email: string } }
interface JobsRes { jobs: Job[]; total: number }

interface User { id: string; email: string; name: string }

export default function CostPage() {
  const { data: jobsData, isLoading } = useQuery<JobsRes>({
    queryKey: ['admin', 'jobs', 1, ''],
    queryFn: () => api.get('/api/admin/jobs?limit=1000'),
  })
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/api/admin/users'),
  })

  const jobs = jobsData?.jobs ?? []

  // Derive per-user stats
  const byUser: Record<string, { email: string; total: number; completed: number; failed: number; totalMs: number }> = {}
  for (const job of jobs) {
    const email = job.user.email
    byUser[email] ??= { email, total: 0, completed: 0, failed: 0, totalMs: 0 }
    byUser[email].total++
    if (job.status === 'completed') byUser[email].completed++
    if (job.status === 'failed') byUser[email].failed++
    if (job.startedAt && job.completedAt) {
      byUser[email].totalMs += new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
    }
  }
  const rows = Object.values(byUser).sort((a, b) => b.total - a.total)

  const totalJobs = jobs.length
  const totalCompleted = jobs.filter(j => j.status === 'completed').length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cost"
        subtitle="Usage proxy — token-level cost tracking coming in a future release"
      />

      <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700">
        Cost tracking is currently based on AI job volume. Token-level billing integration is not yet implemented.
        Job counts serve as a proxy for relative usage across tenants.
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total AI Jobs" value={totalJobs.toLocaleString()} />
        <StatCard label="Completed" value={totalCompleted.toLocaleString()} color="green" />
        <StatCard label="Active Users" value={rows.length} />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Usage by Tenant</p>
        <Table>
          <thead>
            <tr>
              <Th>User / Tenant</Th>
              <Th right>Total Jobs</Th>
              <Th right>Completed</Th>
              <Th right>Failed</Th>
              <Th right>Avg Duration</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <LoadingRows cols={5} />}
            {!isLoading && !rows.length && <EmptyRow cols={5} message="No job data yet" />}
            {rows.map(row => (
              <tr key={row.email} className="hover:bg-zinc-50">
                <Td>{row.email}</Td>
                <Td right mono>{row.total.toLocaleString()}</Td>
                <Td right mono>{row.completed.toLocaleString()}</Td>
                <Td right mono>{row.failed > 0 ? <span className="text-red-600">{row.failed}</span> : '0'}</Td>
                <Td right mono>{row.completed > 0 ? `${(row.totalMs / row.completed / 1000).toFixed(1)}s` : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  )
}
