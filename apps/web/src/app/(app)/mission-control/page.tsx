'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Cpu, CheckCircle2, Clock, AlertTriangle, Mail,
  ListChecks, Zap, ArrowRight
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface ActivityJob {
  id: string; type: string; status: string; createdAt: string; completedAt?: string; error?: string
}

interface ActivityData {
  jobs: ActivityJob[]
  summary: {
    messagesProcessed: number
    tasksCreatedToday: number
    activeJobs: number
    lastActivity: string | null
  }
}

const JOB_LABELS: Record<string, string> = {
  email_processing: 'Analyzed email',
  brief_generation: 'Generated executive brief',
  task_creation: 'Created task from message',
}

const JOB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email_processing: Mail,
  brief_generation: Zap,
  task_creation: ListChecks,
}

export default function MissionControlPage() {
  const { data, isLoading } = useQuery<ActivityData>({
    queryKey: ['ai', 'activity'],
    queryFn: () => api.get('/api/ai/activity'),
    refetchInterval: 8000,
  })

  const { jobs = [], summary } = data ?? {}
  const running = jobs.filter(j => j.status === 'running')
  const recent = jobs.filter(j => j.status !== 'running')

  return (
    <div className="animate-fade-in max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Mission Control</h1>
        <p className="text-muted-foreground mt-1">What your assistant is working on</p>
      </div>

      {/* Pulse status */}
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
        <div className={
          `h-2.5 w-2.5 rounded-full flex-shrink-0 ${
            running.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
          }`
        } />
        <p className="text-sm font-medium">
          {running.length > 0
            ? `Processing ${running.length} item${running.length > 1 ? 's' : ''}...`
            : 'Assistant is on standby — all caught up'}
        </p>
        {summary?.lastActivity && (
          <p className="ml-auto text-xs text-muted-foreground">
            Last active {formatDistanceToNow(new Date(summary.lastActivity))} ago
          </p>
        )}
      </div>

      {/* Today's summary */}
      {summary && (
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Today&apos;s work</p>
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile
              icon={<Mail className="h-4 w-4 text-blue-600" />}
              bg="bg-blue-50"
              value={summary.messagesProcessed}
              label="Messages analyzed"
            />
            <SummaryTile
              icon={<ListChecks className="h-4 w-4 text-purple-600" />}
              bg="bg-purple-50"
              value={summary.tasksCreatedToday}
              label="Tasks created"
            />
            <SummaryTile
              icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
              bg="bg-green-50"
              value={jobs.filter(j => j.status === 'completed').length}
              label="Jobs completed"
            />
          </div>
        </section>
      )}

      {/* Active jobs */}
      {running.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">In progress</p>
          <div className="space-y-2">
            {running.map(job => {
              const Icon = JOB_ICONS[job.type] ?? Cpu
              return (
                <div key={job.id} className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                  <Icon className="h-4 w-4 text-blue-600 animate-pulse-soft" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{JOB_LABELS[job.type] ?? job.type}</p>
                    <p className="text-xs text-muted-foreground">Started {formatDistanceToNow(new Date(job.createdAt))} ago</p>
                  </div>
                  <div className="h-1.5 w-16 bg-blue-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Recent activity</p>
        {recent.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Cpu className="h-8 w-8 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No activity yet.</p>
            <p className="text-xs mt-1">Connect Gmail in Settings to start processing.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {recent.map(job => {
              const Icon = JOB_ICONS[job.type] ?? Cpu
              const isError = job.status === 'failed'
              return (
                <div key={job.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/40 transition-colors">
                  {isError
                    ? <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                    : <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  }
                  <p className="text-sm flex-1">{JOB_LABELS[job.type] ?? job.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.completedAt ? formatDistanceToNow(new Date(job.completedAt)) + ' ago' : '—'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryTile({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: number; label: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
