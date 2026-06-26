'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader, StatCard, Table, Th, Td, Badge, LoadingRows, EmptyRow, duration } from '@/components/ui'

interface Job {
  id: string; type: string; status: string; error?: string; output?: string
  createdAt: string; startedAt?: string; completedAt?: string
  user: { email: string; name: string }
}
interface JobsRes { jobs: Job[]; total: number; page: number; limit: number }

const STATUSES = ['pending', 'running', 'completed', 'failed']
const TYPES = ['process_message', 'generate_brief', 'analyze_task', 'sync_calendar', 'sync_email']

export default function JobsPage() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const LIMIT = 50

  const { data, isLoading } = useQuery<JobsRes>({
    queryKey: ['admin', 'jobs-all', page, filterStatus, filterType],
    queryFn: () => api.get(
      `/api/admin/jobs?page=${page}&limit=${LIMIT}${filterStatus ? `&status=${filterStatus}` : ''}${filterType ? `&type=${filterType}` : ''}`
    ),
    refetchInterval: 10_000,
  })

  const jobs = data?.jobs ?? []
  const total = data?.total ?? 0
  const pages = Math.ceil(total / LIMIT)

  const running = jobs.filter(j => j.status === 'running').length
  const failed = jobs.filter(j => j.status === 'failed').length
  const completed = jobs.filter(j => j.status === 'completed').length

  return (
    <div className="space-y-5">
      <PageHeader title="Background Jobs" subtitle="All processing pipeline jobs across all users" />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total (page)" value={jobs.length} sub={`of ${total.toLocaleString()}`} />
        <StatCard label="Running" value={running} color={running > 0 ? 'yellow' : undefined} />
        <StatCard label="Completed" value={completed} color="green" />
        <StatCard label="Failed" value={failed} color={failed > 0 ? 'red' : undefined} />
      </div>

      <div className="flex items-center gap-2">
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="text-xs border border-zinc-200 px-2 py-1.5 bg-white"
        >
          <option value="">All status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1) }}
          className="text-xs border border-zinc-200 px-2 py-1.5 bg-white"
        >
          <option value="">All types</option>
          {TYPES.map(t => <option key={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        {(filterStatus || filterType) && (
          <button onClick={() => { setFilterStatus(''); setFilterType(''); setPage(1) }} className="text-xs text-zinc-400 hover:text-zinc-700">
            Clear
          </button>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th></Th>
            <Th>ID</Th>
            <Th>Time</Th>
            <Th>User</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th right>Duration</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <LoadingRows cols={7} />}
          {!isLoading && !jobs.length && <EmptyRow cols={7} message="No jobs found" />}
          {jobs.map(job => (
            <>
              <tr
                key={job.id}
                className="hover:bg-zinc-50 cursor-pointer"
                onClick={() => setExpanded(expanded === job.id ? null : job.id)}
              >
                <Td>
                  {(job.error || job.output)
                    ? <span className="text-zinc-300 text-[10px]">{expanded === job.id ? '▾' : '▸'}</span>
                    : <span className="w-3 block" />
                  }
                </Td>
                <Td mono muted>{job.id.slice(0, 8)}…</Td>
                <Td muted>{format(new Date(job.createdAt), 'MMM d HH:mm:ss')}</Td>
                <Td>{job.user.email}</Td>
                <Td muted>{job.type.replace(/_/g, ' ')}</Td>
                <Td><Badge label={job.status} /></Td>
                <Td right mono>{duration(job.startedAt, job.completedAt)}</Td>
              </tr>
              {expanded === job.id && (job.error || job.output) && (
                <tr key={`${job.id}-detail`}>
                  <td colSpan={7} className="px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                    {job.error && (
                      <div className="mb-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">Error</p>
                        <pre className="text-[10px] font-mono text-red-700 bg-red-50 border border-red-200 p-2 overflow-auto max-h-24">
                          {job.error}
                        </pre>
                      </div>
                    )}
                    {job.output && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Output</p>
                        <pre className="text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 p-2 overflow-auto max-h-32">
                          {typeof job.output === 'string' ? job.output : JSON.stringify(job.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </>
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
