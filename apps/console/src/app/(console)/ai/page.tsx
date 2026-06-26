'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { format, formatDistanceToNow } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader, StatCard, Table, Th, Td, Badge, LoadingRows, EmptyRow, duration } from '@/components/ui'

interface Job {
  id: string; type: string; status: string; error?: string
  createdAt: string; startedAt?: string; completedAt?: string
  user: { email: string; name: string }
}
interface JobsRes { jobs: Job[]; total: number; page: number; limit: number }

export default function AIPage() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const LIMIT = 50

  const { data, isLoading } = useQuery<JobsRes>({
    queryKey: ['admin', 'jobs', page, filterStatus],
    queryFn: () => api.get(`/api/admin/jobs?page=${page}&limit=${LIMIT}${filterStatus ? `&status=${filterStatus}` : ''}`),
    refetchInterval: 10_000,
  })

  const jobs = data?.jobs ?? []
  const total = data?.total ?? 0
  const pages = Math.ceil(total / LIMIT)

  const completed = jobs.filter(j => j.status === 'completed').length
  const failed = jobs.filter(j => j.status === 'failed').length
  const running = jobs.filter(j => j.status === 'running').length
  const errorRate = jobs.length > 0 ? Math.round((failed / jobs.length) * 100) : 0

  return (
    <div className="space-y-5">
      <PageHeader title="AI Usage" subtitle="Processing pipeline activity across all users" />

      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Showing" value={jobs.length} sub={`of ${total.toLocaleString()} total`} />
        <StatCard label="Completed" value={completed} color="green" />
        <StatCard label="Running" value={running} color={running > 0 ? 'yellow' : undefined} />
        <StatCard label="Failed" value={failed} color={failed > 0 ? 'red' : undefined} />
        <StatCard label="Error Rate" value={`${errorRate}%`} color={errorRate > 10 ? 'red' : errorRate > 0 ? 'yellow' : 'green'} />
      </div>

      <div className="flex items-center gap-2">
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="text-xs border border-zinc-200 px-2 py-1.5 bg-white"
        >
          <option value="">All status</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Time</Th>
            <Th>User</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th right>Duration</Th>
            <Th>Error</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <LoadingRows cols={7} />}
          {!isLoading && !jobs.length && <EmptyRow cols={7} message="No jobs found" />}
          {jobs.map(job => (
            <tr key={job.id} className="hover:bg-zinc-50">
              <Td mono muted>{job.id.slice(0, 8)}…</Td>
              <Td muted>{format(new Date(job.createdAt), 'MMM d HH:mm:ss')}</Td>
              <Td>{job.user.email}</Td>
              <Td muted>{job.type.replace(/_/g, ' ')}</Td>
              <Td><Badge label={job.status} /></Td>
              <Td right mono>{duration(job.startedAt, job.completedAt)}</Td>
              <Td muted>{job.error ? <span className="text-red-600 text-[10px]">{job.error.slice(0, 60)}</span> : '—'}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {pages > 1 && (
        <div className="flex items-center gap-2 justify-end text-xs text-zinc-500">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 hover:text-zinc-900 disabled:opacity-30">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-1 hover:text-zinc-900 disabled:opacity-30">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
