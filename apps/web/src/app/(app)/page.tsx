'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { useState } from 'react'
import { BellDot, Clock, AlertCircle } from 'lucide-react'
import { MOCK_BRIEF } from '@/data/mockBrief'
import { MOCK_COMMITMENTS, type Commitment } from '@/data/mockCommitments'
import { type ApiTask, toCommitment } from '@/components/day/CommitmentsToday'
import { DecisionBanner } from '@/components/ui/decision-banner'
import { MorningBriefPreview } from '@/components/day/MorningBriefPreview'
import { MorningBriefCard } from '@/components/day/MorningBriefCard'
import { IntelRecommendationCard, type IntelRecommendationItem } from '@/components/intelligence/IntelRecommendationCard'
import { MeetingsToday } from '@/components/day/MeetingsToday'
import { CommitmentsToday } from '@/components/day/CommitmentsToday'
import { PartnerActivityFeed } from '@/components/partners/PartnerActivityFeed'
import { WaitingForCard, type WaitingForItem } from '@/components/intelligence/WaitingForCard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Brief {
  id: string
  content: {
    greeting: string
    situationSummary: string[]
    requiresAttention: {
      title: string
      description: string
      urgency: 'critical' | 'high' | 'normal'
      source: string
    }[]
    decisionsNeeded: { title: string; context: string; deadline?: string }[]
    newRisks: string[]
    resolvedItems: string[]
    commitmentsSummary: string
    followUpsSummary: string
    waitingForSummary: string
    topPriority: string
    _meta: {
      unreadMessages: number
      urgentCount: number
      commitmentsCount: number
      followUpsCount: number
      waitingForCount: number
      overdueCount: number
      suggestedActionsCount: number
      signalsCount: number
    }
  }
}

interface Signal {
  id: string
  type: string
  title: string
  reason: string
  businessImpact: string
  suggestedAction: string
  urgency: 'critical' | 'high' | 'normal'
  entityType?: string
  entityId?: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: brief, isLoading: briefLoading } = useQuery<Brief>({
    queryKey: ['brief', 'today'],
    queryFn: () => api.get('/api/brief/today'),
    retry: false,
  })

  const { data: signals = [] } = useQuery<Signal[]>({
    queryKey: ['signals'],
    queryFn: () => api.get('/api/signals'),
    retry: false,
  })

  const { data: recommendations = [] } = useQuery<IntelRecommendationItem[]>({
    queryKey: ['recommendations'],
    queryFn: () => api.get('/api/recommendations'),
    retry: false,
  })

  const { data: commitmentTasks, isError: commitmentError } = useQuery<ApiTask[]>({
    queryKey: ['tasks', 'commitment'],
    queryFn: () => api.get<ApiTask[]>('/api/tasks?category=commitment&status=pending'),
    retry: false,
  })

  const { data: waitingForTasks, isError: waitingForError } = useQuery<ApiTask[]>({
    queryKey: ['tasks', 'waiting_for'],
    queryFn: () => api.get<ApiTask[]>('/api/tasks?category=waiting_for&status=pending'),
    retry: false,
  })

  const { data: waitingForApiItems } = useQuery<ApiTask[]>({
    queryKey: ['waiting-for'],
    queryFn: () => api.get<ApiTask[]>('/api/waiting-for'),
    retry: false,
  })

  // Derive WaitingForItem list: prefer /api/waiting-for, fall back to mock owed-to-you
  const waitingItems: WaitingForItem[] = waitingForApiItems
    ? waitingForApiItems.map((t: ApiTask) => ({
        id: t.id,
        title: t.title,
        owner: t.waitingFrom ?? t.assigneeName ?? 'Unknown',
        dueDate: t.dueDate ?? '',
        daysUntilDue: 0,
        isOverdue: false,
        context: t.description ?? '',
      }))
    : MOCK_COMMITMENTS
        .filter(c => c.category === 'owed-to-you')
        .map(c => ({
          id: c.id,
          title: c.title,
          owner: c.owner,
          dueDate: c.dueDate,
          daysUntilDue: c.daysUntilDue,
          isOverdue: c.isOverdue,
          context: c.context,
        }))

  // Merge live task queries into Commitment[]; fall back to mock on total failure
  const hasLiveData = commitmentTasks !== undefined || waitingForTasks !== undefined
  const commitments: Commitment[] | undefined = hasLiveData
    ? [...(commitmentTasks ?? []), ...(waitingForTasks ?? [])].map(toCommitment)
    : commitmentError && waitingForError
    ? MOCK_COMMITMENTS
    : undefined // still loading

  const dismissSignal = useMutation({
    mutationFn: (id: string) => api.patch(`/api/signals/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signals'] }),
  })

  const snoozeSignal = useMutation({
    mutationFn: (id: string) => api.patch(`/api/signals/${id}/snooze`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signals'] }),
  })

  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const content = brief?.content

  const greeting = `Good ${timeOfDay()}, ${firstName}.`

  // Decisions count — prefer live data, fall back to mock
  const decisionsReady =
    content?.decisionsNeeded?.length ?? MOCK_BRIEF.decisionsReady

  // Brief preview data — prefer live, fall back to mock
  const briefData = briefLoading
    ? undefined
    : content
    ? { situationSummary: content.situationSummary, topPriority: content.topPriority }
    : { situationSummary: MOCK_BRIEF.situationSummary, topPriority: MOCK_BRIEF.topPriority }

  // Brief card data with _meta
  const briefCardData = briefLoading
    ? undefined
    : content
    ? {
        situationSummary: content.situationSummary,
        topPriority: content.topPriority,
        commitmentsSummary: content.commitmentsSummary,
        followUpsSummary: content.followUpsSummary,
        waitingForSummary: content.waitingForSummary,
        _meta: content._meta,
      }
    : { situationSummary: MOCK_BRIEF.situationSummary, topPriority: MOCK_BRIEF.topPriority }

  // Attention items from live brief — empty when unavailable
  const requiresAttention = content?.requiresAttention ?? []

  // Show signals section label only once even when both sources have items
  const hasSignals = signals.length > 0 || requiresAttention.length > 0

  return (
    <div className="animate-fade-in max-w-2xl space-y-10 pb-16">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {briefLoading
            ? 'Your office is preparing your brief.'
            : 'Your office has prepared today’s priorities.'}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>

      {/* ── Decision banner ───────────────────────────────────────────────── */}
      {decisionsReady > 0 && (
        <DecisionBanner
          count={decisionsReady}
          onView={() => router.push('/decisions')}
        />
      )}

      {/* ── Situation + focus ─────────────────────────────────────────────── */}
      <MorningBriefCard brief={briefCardData} isLoading={briefLoading} />

      {/* ── Needs attention today ─────────────────────────────────────────── */}
      {hasSignals && (
        <section className="space-y-2">
          <Label>Needs attention today</Label>

          {/* Live signals from API */}
          {signals.slice(0, 4).map(signal => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onDismiss={() => dismissSignal.mutate(signal.id)}
              onSnooze={() => snoozeSignal.mutate(signal.id)}
            />
          ))}

          {/* Attention items from brief */}
          {requiresAttention.map((item, i) => (
            <div
              key={i}
              className={`px-4 py-3.5 rounded-xl border ${
                item.urgency === 'critical'
                  ? 'border-red-200 bg-red-50/40'
                  : item.urgency === 'high'
                  ? 'border-orange-200 bg-orange-50/30'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                    item.urgency === 'critical'
                      ? 'text-red-500'
                      : item.urgency === 'high'
                      ? 'text-orange-400'
                      : 'text-muted-foreground'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Prepared for you ─────────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <section className="space-y-2">
          <Label>Prepared for you</Label>
          {recommendations.slice(0, 3).map(rec => (
            <IntelRecommendationCard
              key={rec.id}
              item={rec}
              onAct={(id) => {
                void api.post(`/api/signals/${id}/dismiss`)
                void qc.invalidateQueries({ queryKey: ['recommendations'] })
              }}
              onDismiss={(id) => {
                void api.post(`/api/signals/${id}/dismiss`)
                void qc.invalidateQueries({ queryKey: ['recommendations'] })
              }}
            />
          ))}
        </section>
      )}

      {/* ── Meetings today ────────────────────────────────────────────────── */}
      <section>
        <Label>Meetings today</Label>
        <MeetingsToday />
      </section>

      {/* ── Priority decisions ────────────────────────────────────────────── */}
      <section className="space-y-2">
        <Label>Priority decisions</Label>
        {(content?.decisionsNeeded?.length ?? 0) > 0 ? (
          content!.decisionsNeeded.map((d, i) => (
            <div key={i} className="px-4 py-3.5 rounded-xl border bg-card">
              <p className="text-sm font-medium leading-snug">{d.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.context}</p>
              {d.deadline && (
                <p className="text-xs text-orange-600 mt-2 font-medium">{d.deadline}</p>
              )}
            </div>
          ))
        ) : (
          <div className="px-4 py-3.5 rounded-xl border border-border bg-card/50">
            <p className="text-sm text-muted-foreground/60 italic">
              Being prepared by your office.
            </p>
          </div>
        )}
      </section>

      {/* ── Commitments ───────────────────────────────────────────────────── */}
      <section>
        <Label>Commitments</Label>
        <CommitmentsToday commitments={commitments} />
      </section>

      {/* ── Waiting for others ────────────────────────────────────────────── */}
      <section>
        <Label>Waiting for others</Label>
        {waitingItems.length === 0 ? (
          <div className="px-4 py-3.5 rounded-xl border border-border bg-card/50">
            <p className="text-sm text-muted-foreground/60 italic">Nothing outstanding — your team is on track.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {waitingItems.slice(0, 4).map(item => (
              <WaitingForCard
                key={item.id}
                item={item}
                onNudge={(id) => { /* fire api.post(`/api/tasks/${id}/nudge`) */ }}
                onMark={(id) => { api.patch(`/api/tasks/${id}`, { status: 'completed' }).catch(() => {}) }}
              />
            ))}
            {waitingItems.length > 4 && (
              <p className="text-[11px] text-muted-foreground pl-1">+{waitingItems.length - 4} more</p>
            )}
          </div>
        )}
      </section>

      {/* ── Office activity ───────────────────────────────────────────────── */}
      <section>
        <Label>What your office is working on</Label>
        <PartnerActivityFeed />
      </section>

    </div>
  )
}

// ─── Signal card ──────────────────────────────────────────────────────────────

function SignalCard({
  signal,
  onDismiss,
  onSnooze,
}: {
  signal: Signal
  onDismiss: () => void
  onSnooze: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${
        signal.urgency === 'critical'
          ? 'border-red-200 bg-red-50/40'
          : signal.urgency === 'high'
          ? 'border-orange-200 bg-orange-50/30'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <BellDot
          className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
            signal.urgency === 'critical'
              ? 'text-red-500'
              : signal.urgency === 'high'
              ? 'text-orange-400'
              : 'text-muted-foreground'
          }`}
        />
        <div className="flex-1 min-w-0">
          <button onClick={() => setExpanded(e => !e)} className="text-left w-full">
            <p className="text-sm font-medium leading-snug">{signal.title}</p>
            {!expanded && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
                {signal.reason}
              </p>
            )}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-muted-foreground leading-relaxed">{signal.reason}</p>
              {signal.businessImpact && (
                <p className="text-xs text-foreground/70 leading-relaxed">{signal.businessImpact}</p>
              )}
              {signal.suggestedAction && (
                <p className="text-xs font-medium text-primary leading-relaxed">
                  {signal.suggestedAction}
                </p>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={onSnooze}
              className="flex items-center gap-1 h-6 px-2 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Clock className="h-3 w-3" />
              Snooze
            </button>
            <button
              onClick={onDismiss}
              className="h-6 px-2 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

function BriefSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-14 bg-muted rounded-xl" />
      <div className="h-10 bg-muted rounded-xl" />
    </div>
  )
}

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
