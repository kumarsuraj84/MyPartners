'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  CheckCircle2, AlertTriangle, Mail, ListChecks, Zap, ArrowRight,
  ChevronDown, ChevronRight, Activity, Inbox, User, Building2, FolderOpen, Lightbulb,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'
import { useState } from 'react'

interface MemoryEntity {
  id: string; entityType: string; confidence: number; extractedText?: string
  person?: { id: string; name: string; email?: string; organization?: { name: string } | null } | null
  organization?: { id: string; name: string; domain?: string } | null
  project?: { id: string; name: string; status: string } | null
  decision?: { id: string; title: string; status: string } | null
}

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  person: User,
  organization: Building2,
  project: FolderOpen,
  decision: Lightbulb,
}

function MemoryGraph({ messageId }: { messageId: string }) {
  const { data } = useQuery<{ entities: MemoryEntity[] }>({
    queryKey: ['memory', 'message', messageId],
    queryFn: () => api.get(`/api/memory/message/${messageId}`),
  })

  if (!data?.entities.length) return null

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">
        Remembered
      </p>
      <div className="space-y-1.5">
        {data.entities.map(entity => {
          const Icon = ENTITY_ICONS[entity.entityType] ?? Zap
          const label = entity.person?.name
            ?? entity.organization?.name
            ?? entity.project?.name
            ?? entity.decision?.title
            ?? entity.extractedText
            ?? entity.entityType

          const detail = entity.person?.organization?.name
            ?? entity.organization?.domain
            ?? entity.project?.status
            ?? entity.decision?.status

          return (
            <div key={entity.id} className="flex items-center gap-2 text-xs">
              <Icon className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
              <span className="text-foreground/70 font-medium">{label}</span>
              {detail && <span className="text-muted-foreground/50">· {detail}</span>}
              {entity.confidence < 0.9 && (
                <span className="text-muted-foreground/40 ml-auto">{Math.round(entity.confidence * 100)}%</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ActivityJob {
  id: string
  type: string
  status: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  metadata?: { stage?: string }
}

const STAGE_LABELS: Record<string, string> = {
  understanding: 'Reading the message…',
  extracting:    'Finding what matters…',
  recording:     'Updating your lists…',
  remembering:   'Saving important details…',
  complete:      'Done',
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
  health: {
    queue: number
    lastSuccess: string | null
    errorRate: number
    groqConfigured: boolean
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

function ReasoningOutput({ output }: { output: Record<string, unknown> }) {
  const fields: { label: string; key: string }[] = [
    { label: 'Summary', key: 'summary' },
    { label: 'Priority', key: 'priority' },
    { label: 'Sentiment', key: 'sentiment' },
  ]
  const actionItems = output.actionItems as string[] | undefined
  const commitments = output.commitments as string[] | undefined
  const followUps = output.followUps as string[] | undefined

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-2.5 text-xs">
      {(fields as { label: string; key: string }[]).map(f => output[f.key] != null && (
        <div key={f.key} className="flex gap-2">
          <span className="text-muted-foreground/60 w-16 flex-shrink-0">{f.label}</span>
          <span className="text-foreground/70">{String(output[f.key])}</span>
        </div>
      ))}
      {actionItems && actionItems.length > 0 && (
        <div className="flex gap-2">
          <span className="text-muted-foreground/60 w-16 flex-shrink-0">Actions</span>
          <ul className="space-y-0.5 flex-1">
            {actionItems.map((a, i) => <li key={i} className="text-foreground/70">· {a}</li>)}
          </ul>
        </div>
      )}
      {commitments && commitments.length > 0 && (
        <div className="flex gap-2">
          <span className="text-muted-foreground/60 w-16 flex-shrink-0">Committed</span>
          <ul className="space-y-0.5 flex-1">
            {commitments.map((c, i) => <li key={i} className="text-foreground/70">· {c}</li>)}
          </ul>
        </div>
      )}
      {followUps && followUps.length > 0 && (
        <div className="flex gap-2">
          <span className="text-muted-foreground/60 w-16 flex-shrink-0">Follow-ups</span>
          <ul className="space-y-0.5 flex-1">
            {followUps.map((f, i) => <li key={i} className="text-foreground/70">· {f}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

interface ReplayEvent {
  ts: string
  stage: string
  label: string
  detail: string | null
}

function ReplayTimeline({ messageId }: { messageId: string }) {
  const { data, isLoading } = useQuery<{ events: ReplayEvent[]; processed: boolean }>({
    queryKey: ['replay', messageId],
    queryFn: () => api.get(`/api/ai/replay/${messageId}`),
  })

  if (isLoading) return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">How it was handled</p>
      <div className="space-y-2 animate-pulse">
        <div className="h-3 w-40 bg-muted rounded" />
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
    </div>
  )

  if (!data?.events.length) return null

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2.5">How it was handled</p>
      <div className="relative space-y-2.5 pl-4">
        {/* Vertical line */}
        <div className="absolute left-1.5 top-1.5 bottom-1.5 w-px bg-border/50" />
        {data.events.map((event, i) => (
          <div key={i} className="relative flex items-start gap-2.5">
            <div className={`absolute -left-3 mt-0.5 h-2.5 w-2.5 rounded-full border-2 flex-shrink-0 ${
              event.stage === 'complete' ? 'bg-green-500 border-green-500' :
              event.stage === 'failed' ? 'bg-orange-400 border-orange-400' :
              'bg-background border-border'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-xs font-medium text-foreground/80">{event.label}</p>
                <p className="text-[10px] text-muted-foreground/50 flex-shrink-0">
                  {format(new Date(event.ts), 'h:mm a')}
                </p>
              </div>
              {event.detail && (
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{event.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function JobRow({ job }: { job: ActivityJob }) {
  const [expanded, setExpanded] = useState(false)
  const failed = job.status === 'failed'
  const messageId = job.input?.messageId && typeof job.input.messageId === 'string' ? job.input.messageId : null
  const hasOutput = !!job.output && Object.keys(job.output).length > 0
  const isExpandable = hasOutput || !!messageId

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors text-left"
        onClick={() => isExpandable && setExpanded(e => !e)}
        disabled={!isExpandable}
      >
        {failed
          ? <AlertTriangle className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
          : <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
        }
        <p className="text-sm flex-1 text-foreground/80">
          {failed
            ? `Couldn't complete: ${jobLabel(job.type, 'done').toLowerCase()}`
            : jobLabel(job.type, 'done')}
        </p>
        <p className="text-xs text-muted-foreground flex-shrink-0 mr-1.5">
          {job.completedAt
            ? formatDistanceToNow(new Date(job.completedAt)) + ' ago'
            : '—'}
        </p>
        {isExpandable && (
          expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-1">
          {/* Replay timeline — shown first for email processing */}
          {messageId && <ReplayTimeline messageId={messageId} />}
          {job.output && <ReasoningOutput output={job.output} />}
          {messageId && <MemoryGraph messageId={messageId} />}
          {failed && job.error && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-orange-600/80">{job.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MissionControlPage() {
  const { data } = useQuery<ActivityData>({
    queryKey: ['ai', 'activity'],
    queryFn: () => api.get('/api/ai/activity'),
    refetchInterval: 8000,
  })

  const { jobs = [], status, health } = data ?? {}
  const running = jobs.filter(j => j.status === 'running')
  const recent  = jobs.filter(j => j.status !== 'running')

  return (
    <div className="animate-fade-in max-w-2xl space-y-8 pb-16">

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mission Control</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">What your assistant is working on</p>
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
            : 'All set — nothing to do right now.'}
        </p>
        {status?.lastActivity && (
          <p className="ml-auto text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(status.lastActivity))} ago
          </p>
        )}
      </div>

      {/* Health bar */}
      {health && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl border bg-card text-xs">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-muted-foreground">Health</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${health.groqConfigured ? 'bg-green-500' : 'bg-orange-400'}`} />
            <span className="text-foreground/70">{health.groqConfigured ? 'Ready' : 'Not configured'}</span>
          </div>

          {health.lastSuccess && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-foreground/70">Reviewed {formatDistanceToNow(new Date(health.lastSuccess))} ago</span>
            </div>
          )}

          {health.errorRate > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              <span className="text-foreground/70">{health.errorRate}% errors</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <Inbox className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-foreground/70">
              {health.queue === 0 ? 'All caught up' : `${health.queue} to review`}
            </span>
          </div>
        </div>
      )}

      {/* Outcome summary */}
      {status && (
        <section className="space-y-3">
          <Label>Right now</Label>

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
                  <p className="text-sm font-medium flex-1">
                    {job.metadata?.stage && STAGE_LABELS[job.metadata.stage]
                      ? STAGE_LABELS[job.metadata.stage]
                      : jobLabel(job.type, 'doing')}
                  </p>
                  <div className="h-1 w-14 bg-blue-100 rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full w-3/4 bg-blue-400 rounded-full animate-pulse" />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Audit trail — expandable, shows AI reasoning */}
      {recent.length > 0 && (
        <section>
          <Label>Recent activity</Label>
          <div className="space-y-1">
            {recent.map(job => <JobRow key={job.id} job={job} />)}
          </div>
        </section>
      )}

      {!status && recent.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground">Everything is organized.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your inbox in Settings and your assistant will get to work.
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
