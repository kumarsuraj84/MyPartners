'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CheckCircle2, AlertTriangle, Mail, ListChecks, Zap, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface ActivityJob {
  id: string; type: string; status: string; createdAt: string; completedAt?: string; error?: string
}

interface ActivityData {
  jobs: ActivityJob[]
  status: {
    needsAttention: number
    totalUnread: number
    activeFollowUps: number
    activeCommitments: number
    waitingFor: number
    activeJobs: number
    lastActivity: string | null
  }
}

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

function outcomeStatement(s: ActivityData['status']): string {
  if (s.needsAttention === 0 && s.totalUnread === 0) {
    return "I've gone through everything. You're up to date."
  }
  if (s.needsAttention === 0 && s.totalUnread > 0) {
    return `I've reviewed everything. Nothing urgent — you're clear.`
  }
  if (s.needsAttention === 1) {
    return `There's one conversation that needs you. Everything else is handled.`
  }
  return `${s.needsAttention} conversations need your attention. I've handled the rest.`
}

function trackingStatement(s: ActivityData['status']): string | null {
  const parts: string[] = []
  if (s.activeFollowUps > 0) {
    parts.push(s.activeFollowUps === 1
      ? "One follow-up is in motion."
      : `${s.activeFollowUps} follow-ups are in motion.`)
  }
  if (s.activeCommitments > 0) {
    parts.push(s.activeCommitments === 1
      ? "You have one open commitment."
      : `You have ${s.activeCommitments} open commitments.`)
  }
  if (s.waitingFor > 0) {
    parts.push(s.waitingFor === 1
      ? "One item is pending from someone else."
      : `${s.waitingFor} items are pending from others.`)
  }
  return parts.length > 0 ? parts.join(' ') : null
}

export default function MissionControlPage() {
  const { data } = useQuery<ActivityData>({
    queryKey: ['ai', 'activity'],
    queryFn: () => api.get('/api/ai/activity'),
    refetchInterval: 8000,
  })

  const { jobs = [], status } = data ?? {}
  const running = jobs.filter(j => j.status === 'running')
  const recent  = jobs.filter(j => j.status !== 'running')

  return (
    <div className="animate-fade-in max-w-2xl space-y-8 pb-16">

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mission Control</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">What your assistant is working on right now</p>
      </div>

      {/* Pulse status */}
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-card">
        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
          running.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
        }`} />
        <p className="text-sm font-medium">
          {running.length > 0
            ? running.length === 1
              ? 'Your assistant is working on something…'
              : `Your assistant is working on ${running.length} things…`
            : 'Your assistant is on standby.'}
        </p>
        {status?.lastActivity && (
          <p className="ml-auto text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(status.lastActivity))} ago
          </p>
        )}
      </div>

      {/* Outcome summary — what the executive needs to know */}
      {status && (
        <section className="space-y-3">
          <Label>Right now</Label>

          {/* Attention statement */}
          <div className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border ${
            status.needsAttention > 0
              ? 'border-orange-200 bg-orange-50/30'
              : 'border-green-200 bg-green-50/30'
          }`}>
            <div className={`h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0 ${
              status.needsAttention > 0 ? 'bg-orange-400' : 'bg-green-500'
            }`} />
            <div className="flex-1">
              <p className="text-sm font-medium">{outcomeStatement(status)}</p>
              {status.needsAttention > 0 && (
                <Link href="/inbox" className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline">
                  See what needs you <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Tracking statement */}
          {trackingStatement(status) && (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border bg-card">
              <div className="h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0 bg-blue-400" />
              <div className="flex-1">
                <p className="text-sm text-foreground/80">{trackingStatement(status)}</p>
                <Link href="/tasks" className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline">
                  Review your list <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
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

      {/* Recent activity — kept as a trust-building audit trail, not metrics */}
      {recent.length > 0 && (
        <section>
          <Label>Recent</Label>
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
        </section>
      )}

      {!status && recent.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your inbox in Settings to get started.
          </p>
        </div>
      )}
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
