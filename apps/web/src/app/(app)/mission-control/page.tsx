'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CheckCircle2, AlertTriangle, Mail, ListChecks, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

// What the executive sees — outcomes, not system operations
const JOB_COPY: Record<string, { doing: string; done: string }> = {
  email_processing: {
    doing: 'Reviewing your email',
    done:  'Reviewed and organized email',
  },
  brief_generation: {
    doing: 'Preparing your brief',
    done:  'Prepared your morning brief',
  },
  task_creation: {
    doing: 'Adding item to your list',
    done:  'Added to your task list',
  },
}

const JOB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email_processing: Mail,
  brief_generation: Zap,
  task_creation:    ListChecks,
}

function jobLabel(type: string, phase: 'doing' | 'done') {
  return JOB_COPY[type]?.[phase] ?? (phase === 'doing' ? 'Working…' : 'Done')
}

export default function MissionControlPage() {
  const { data } = useQuery<ActivityData>({
    queryKey: ['ai', 'activity'],
    queryFn: () => api.get('/api/ai/activity'),
    refetchInterval: 8000,
  })

  const { jobs = [], summary } = data ?? {}
  const running = jobs.filter(j => j.status === 'running')
  const recent  = jobs.filter(j => j.status !== 'running')

  return (
    <div className="animate-fade-in max-w-2xl space-y-8 pb-16">

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mission Control</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">What your assistant is working on right now</p>
      </div>

      {/* Status line */}
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-card">
        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
          running.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
        }`} />
        <p className="text-sm font-medium">
          {running.length > 0
            ? running.length === 1
              ? 'Your assistant is working on something…'
              : `Your assistant is working on ${running.length} things…`
            : 'Everything is organized. Your assistant is on standby.'}
        </p>
        {summary?.lastActivity && (
          <p className="ml-auto text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(summary.lastActivity))} ago
          </p>
        )}
      </div>

      {/* Today's summary */}
      {summary && (
        <section>
          <Label>Today</Label>
          <div className="grid grid-cols-3 gap-3">
            <Tile
              icon={<Mail className="h-4 w-4 text-blue-600" />}
              bg="bg-blue-50"
              value={summary.messagesProcessed}
              label="Messages reviewed"
            />
            <Tile
              icon={<ListChecks className="h-4 w-4 text-purple-600" />}
              bg="bg-purple-50"
              value={summary.tasksCreatedToday}
              label="Items organized"
            />
            <Tile
              icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
              bg="bg-green-50"
              value={jobs.filter(j => j.status === 'completed').length}
              label="Actions taken"
            />
          </div>
        </section>
      )}

      {/* Currently working on */}
      {running.length > 0 && (
        <section>
          <Label>Working on now</Label>
          <div className="space-y-2">
            {running.map(job => {
              const Icon = JOB_ICONS[job.type] ?? Zap
              return (
                <div key={job.id} className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-blue-100 bg-blue-50/30">
                  <Icon className="h-4 w-4 text-blue-500 animate-pulse-soft flex-shrink-0" />
                  <p className="text-sm font-medium flex-1">{jobLabel(job.type, 'doing')}</p>
                  <div className="h-1 w-14 bg-blue-100 rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full w-3/4 bg-blue-400 rounded-full animate-pulse" />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <Label>Recent</Label>
        {recent.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Connect your inbox in Settings to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {recent.map(job => {
              const failed = job.status === 'failed'
              return (
                <div key={job.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-colors">
                  {failed
                    ? <AlertTriangle className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                    : <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  }
                  <p className="text-sm flex-1 text-foreground/80">
                    {failed
                      ? `Couldn't complete: ${jobLabel(job.type, 'done').toLowerCase()}`
                      : jobLabel(job.type, 'done')}
                  </p>
                  <p className="text-xs text-muted-foreground flex-shrink-0">
                    {job.completedAt
                      ? formatDistanceToNow(new Date(job.completedAt)) + ' ago'
                      : '—'}
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

function Tile({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: number; label: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
