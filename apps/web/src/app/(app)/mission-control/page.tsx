'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/ui/section-header'
import { TimelineEvent } from '@/components/ui/timeline-event'
import { EntityChip } from '@/components/ui/entity-chip'
import { RecommendationCard } from '@/components/ui/recommendation-card'
import {
  MOCK_OFFICE_EVENTS,
  MOCK_MEMORY_UPDATES,
  MOCK_WHAT_HAPPENED,
  MOCK_RECOMMENDATIONS,
  type OfficeEvent,
  type MemoryEntityType,
} from '@/data/mockOffice'
import { ChevronDown, ChevronRight } from 'lucide-react'

// ─── Group events by partner ──────────────────────────────────────────────────

function groupByPartner(events: OfficeEvent[]): Record<string, OfficeEvent[]> {
  return events.reduce<Record<string, OfficeEvent[]>>((acc, ev) => {
    if (!acc[ev.partnerName]) acc[ev.partnerName] = []
    acc[ev.partnerName].push(ev)
    return acc
  }, {})
}

// ─── Activity Log Row ─────────────────────────────────────────────────────────

type ActivityJob = {
  id: string
  status: string
  description?: string
  created_at?: string
  createdAt?: string
  output?: string | Record<string, unknown>
}

function ActivityRow({ job }: { job: ActivityJob }) {
  const [open, setOpen] = useState(false)

  const statusLabel: Record<string, string> = {
    completed: 'Taken Care Of',
    running: 'Reviewing',
    pending: 'Waiting',
    failed: 'Needs Attention',
  }

  const statusColor: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    running: 'bg-blue-50 text-blue-700 border-blue-200/60',
    pending: 'bg-amber-50 text-amber-700 border-amber-200/60',
    failed: 'bg-red-50 text-red-700 border-red-200/60',
  }

  const label = statusLabel[job.status] ?? job.status
  const color = statusColor[job.status] ?? 'bg-muted text-muted-foreground border-border'

  const outputStr =
    job.output == null
      ? undefined
      : typeof job.output === 'string'
        ? job.output
        : JSON.stringify(job.output, null, 2)

  const timestamp = job.createdAt ?? job.created_at

  return (
    <div className="border-b border-border/50 last:border-0">
      <div className="flex items-start gap-3 px-4 py-3">
        <span
          className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5',
            color,
          )}
        >
          {label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground/80 leading-relaxed">
            {job.description ?? 'Office activity'}
          </p>
          {timestamp && (
            <p className="text-[11px] text-muted-foreground/50 mt-0.5 tabular-nums">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        {outputStr && (
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-expanded={open}
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Detail
          </button>
        )}
      </div>
      {open && outputStr && (
        <div className="px-4 pb-3">
          <pre className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono bg-muted/40 rounded-lg px-3 py-2.5 overflow-x-auto">
            {outputStr}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 minute ago'
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 hour ago'
  return `${hours} hours ago`
}

// ─── Live indicator ───────────────────────────────────────────────────────────

function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[11px] font-medium text-emerald-600">Live</span>
    </span>
  )
}

// ─── Activity response type ───────────────────────────────────────────────────

type ActivityRecommendation = {
  id: string
  text: string
  preparedBy?: string
}

type ActivityMemoryUpdate = {
  entityType: string
  entityName: string
  change: string
  time: string
}

type ActivityResponse =
  | ActivityJob[]
  | {
      jobs: ActivityJob[]
      status?: Record<string, unknown>
      whatHappened?: string[]
      recommendations?: ActivityRecommendation[]
      memoryUpdates?: ActivityMemoryUpdate[]
    }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecutiveOfficePage() {
  const { data: rawData, isError, dataUpdatedAt } = useQuery<ActivityResponse>({
    queryKey: ['office-activity'],
    queryFn: async () => {
      const res = await fetch('/api/ai/activity')
      if (!res.ok) throw new Error('unavailable')
      return res.json()
    },
    retry: false,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })

  // Handle both response shapes: direct array (old jobs endpoint) or activity object
  const isActivityObject = rawData != null && !Array.isArray(rawData)

  const apiJobs: ActivityJob[] | null = rawData == null
    ? null
    : Array.isArray(rawData)
      ? rawData
      : rawData.jobs ?? null

  const apiWhatHappened: string[] | null = isActivityObject
    ? (rawData as Exclude<ActivityResponse, ActivityJob[]>).whatHappened ?? null
    : null

  const apiRecommendations: ActivityRecommendation[] | null = isActivityObject
    ? (rawData as Exclude<ActivityResponse, ActivityJob[]>).recommendations ?? null
    : null

  const apiMemoryUpdates: ActivityMemoryUpdate[] | null = isActivityObject
    ? (rawData as Exclude<ActivityResponse, ActivityJob[]>).memoryUpdates ?? null
    : null

  const hasLiveData = !isError && rawData != null
  const hasLiveJobs = !isError && apiJobs != null && apiJobs.length > 0

  const partnerGroups = groupByPartner(MOCK_OFFICE_EVENTS)
  const partnerOrder = Array.from(
    new Set(MOCK_OFFICE_EVENTS.map(e => e.partnerName)),
  )

  return (
    <div className="animate-fade-in max-w-2xl space-y-10 pb-16">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Executive Office</h1>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <p className="text-sm text-muted-foreground">
            Everything your office prepared today.
          </p>
          {hasLiveData && <LiveIndicator />}
          {dataUpdatedAt > 0 && (
            <span className="text-[11px] text-muted-foreground/50 tabular-nums">
              Updated {relativeTime(dataUpdatedAt)}
            </span>
          )}
        </div>
      </div>

      {/* ── 1. What happened today ── */}
      <div>
        <SectionLabel>What happened today</SectionLabel>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-4 space-y-1">
            {(apiWhatHappened != null && apiWhatHappened.length > 0
              ? apiWhatHappened
              : MOCK_WHAT_HAPPENED
            ).map((line, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. What was prepared ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SectionHeader
            title="What was prepared"
            count={hasLiveJobs ? apiJobs.length : MOCK_OFFICE_EVENTS.length}
          />
          {hasLiveJobs && <LiveIndicator />}
        </div>
        {hasLiveJobs ? (
          <div className="rounded-xl border bg-card overflow-hidden">
            {apiJobs.map(job => <ActivityRow key={job.id} job={job} />)}
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border/50">
            {partnerOrder.map(partner => {
              const events = partnerGroups[partner]
              return (
                <div key={partner} className="px-4 py-3.5">
                  <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2.5">
                    {partner}
                  </p>
                  <div className="space-y-3">
                    {events.map(ev => (
                      <TimelineEvent
                        key={ev.id}
                        time={ev.time}
                        actor={ev.partnerName}
                        action={ev.action}
                        details={ev.details}
                        type={ev.type}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 3. Memory updates ── */}
      <div>
        {(() => {
          const memoryUpdates = apiMemoryUpdates != null && apiMemoryUpdates.length > 0
            ? apiMemoryUpdates
            : MOCK_MEMORY_UPDATES
          return (
            <>
              <SectionHeader title="Memory updates" count={memoryUpdates.length} />
              <SectionLabel>What your office added to memory today</SectionLabel>
              <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border/50">
                {memoryUpdates.map((mu, i) => (
                  <div key={'id' in mu ? (mu as { id: string }).id : i} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <EntityChip type={mu.entityType as MemoryEntityType} name={mu.entityName} />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-0.5">
                        {mu.change}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground/50 flex-shrink-0 whitespace-nowrap tabular-nums pt-0.5">
                      {mu.time}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )
        })()}
      </div>

      {/* ── 4. Recommendations ── */}
      <div>
        <SectionLabel>Recommendations</SectionLabel>
        <div className="space-y-2.5">
          {(apiRecommendations != null && apiRecommendations.length > 0
            ? apiRecommendations
            : MOCK_RECOMMENDATIONS
          ).map(rec => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec.text}
              preparedBy={rec.preparedBy ?? ''}
            />
          ))}
        </div>
      </div>

      {/* ── 5. Detailed activity (Office Activity Log) ── */}
      <div>
        <SectionHeader title="Office Activity Log" />
        {isError || apiJobs == null ? (
          <div className="rounded-xl border bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Office activity log is not available right now.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            {apiJobs.length === 0 ? (
              <div className="px-4 py-4">
                <p className="text-xs text-muted-foreground">No activity recorded yet today.</p>
              </div>
            ) : (
              apiJobs.map(job => <ActivityRow key={job.id} job={job} />)
            )}
          </div>
        )}
      </div>

    </div>
  )
}
