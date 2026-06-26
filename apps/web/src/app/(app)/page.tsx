'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CheckCircle2, AlertCircle, Clock, ArrowRight, Zap,
  RefreshCw, ChevronRight, Users, Calendar
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface BriefMeta {
  unreadMessages: number
  urgentCount: number
  commitmentsCount: number
  followUpsCount: number
  waitingForCount: number
  overdueCount: number
  suggestedActionsCount: number
}

interface Brief {
  id: string
  content: {
    greeting: string
    handledByAI: string[]
    requiresAttention: { title: string; description: string; urgency: 'critical' | 'high' | 'normal'; source: string }[]
    decisionsNeeded: { title: string; context: string; deadline?: string }[]
    commitmentsSummary: string
    followUpsSummary: string
    waitingForSummary: string
    topPriority: string
    _meta: BriefMeta
  }
}

interface Task {
  id: string; title: string; category: string; priority: string; dueDate?: string; waitingFrom?: string
}

interface SuggestedAction {
  id: string; label: string; type: string; detail?: string
  message: { subject?: string; fromName?: string; fromAddress: string }
}

export default function HomePage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: brief, isLoading: briefLoading } = useQuery<Brief>({
    queryKey: ['brief', 'today'],
    queryFn: () => api.get('/api/brief/today'),
  })

  const { data: commitments = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'commitments'],
    queryFn: () => api.get('/api/tasks/commitments'),
  })

  const { data: followUps = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'follow-ups'],
    queryFn: () => api.get('/api/tasks/follow-ups'),
  })

  const { data: waitingFor = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'waiting-for'],
    queryFn: () => api.get('/api/tasks/waiting-for'),
  })

  const { data: suggestedActions = [] } = useQuery<SuggestedAction[]>({
    queryKey: ['actions'],
    queryFn: () => api.get('/api/actions'),
  })

  const regenerateBrief = useMutation({
    mutationFn: () => api.post('/api/brief/generate'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brief'] }),
  })

  const dismissAction = useMutation({
    mutationFn: (id: string) => api.patch(`/api/actions/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  })

  const actOnAction = useMutation({
    mutationFn: (id: string) => api.patch(`/api/actions/${id}/act`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  })

  const completeTask = useMutation({
    mutationFn: (id: string) => api.patch(`/api/tasks/${id}`, { status: 'completed' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['brief'] })
    },
  })

  const content = brief?.content
  const meta = content?._meta

  const greeting = content?.greeting
    ? content.greeting.replace('{name}', user?.name?.split(' ')[0] ?? 'there')
    : `Good ${timeOfDay()}, ${user?.name?.split(' ')[0] ?? 'there'}`

  return (
    <div className="animate-fade-in max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}</h1>
          <p className="text-muted-foreground mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <button
          onClick={() => regenerateBrief.mutate()}
          disabled={regenerateBrief.isPending}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${regenerateBrief.isPending ? 'animate-spin' : ''}`} />
          Refresh brief
        </button>
      </div>

      {/* Top priority banner */}
      {content?.topPriority && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">Top priority right now</p>
            <p className="text-sm font-medium">{content.topPriority}</p>
          </div>
        </div>
      )}

      {/* What the AI has handled */}
      {content?.handledByAI && content.handledByAI.length > 0 && (
        <section>
          <SectionHeader label="Assistant handled" />
          <div className="space-y-1.5">
            {content.handledByAI.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Requires attention */}
      {content?.requiresAttention && content.requiresAttention.length > 0 && (
        <section>
          <SectionHeader label="Requires your attention" count={content.requiresAttention.length} />
          <div className="space-y-2">
            {content.requiresAttention.map((item, i) => (
              <div key={i} className={
                `flex items-start gap-3 p-4 rounded-xl border ${
                  item.urgency === 'critical' ? 'border-red-200 bg-red-50/50' :
                  item.urgency === 'high' ? 'border-orange-200 bg-orange-50/50' :
                  'border-border bg-card'
                }`
              }>
                <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  item.urgency === 'critical' ? 'text-red-500' :
                  item.urgency === 'high' ? 'text-orange-500' : 'text-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  {item.source && <p className="text-xs text-muted-foreground mt-1 opacity-70">via {item.source}</p>}
                </div>
                {item.urgency !== 'normal' && (
                  <Badge variant={item.urgency === 'critical' ? 'urgent' : 'high'} className="flex-shrink-0">{item.urgency}</Badge>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Decisions needed */}
      {content?.decisionsNeeded && content.decisionsNeeded.length > 0 && (
        <section>
          <SectionHeader label="Decisions needed today" count={content.decisionsNeeded.length} />
          <div className="space-y-2">
            {content.decisionsNeeded.map((d, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-card">
                <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.context}</p>
                  {d.deadline && <p className="text-xs text-orange-600 mt-1 font-medium">Due: {d.deadline}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Suggested actions */}
      {suggestedActions.length > 0 && (
        <section>
          <SectionHeader label="Suggested actions" count={suggestedActions.length} />
          <div className="space-y-2">
            {suggestedActions.slice(0, 4).map(action => (
              <div key={action.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {action.message.subject ?? action.message.fromName ?? action.message.fromAddress}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismissAction.mutate(action.id)}>Dismiss</Button>
                  <Button size="sm" className="h-7 text-xs" onClick={() => actOnAction.mutate(action.id)}>
                    Do it <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Commitments / Follow-ups / Waiting For — three-column tracker */}
      <section>
        <SectionHeader label="Tracking" />
        <div className="grid grid-cols-3 gap-4">

          <TrackerCard
            title="My Commitments"
            icon={<Calendar className="h-3.5 w-3.5" />}
            items={commitments}
            emptyText={content?.commitmentsSummary || 'No pending commitments'}
            renderItem={t => (
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs leading-relaxed">{t.title}</p>
                <button onClick={() => completeTask.mutate(t.id)} className="flex-shrink-0 text-muted-foreground hover:text-green-600 transition-colors mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          />

          <TrackerCard
            title="Follow-ups"
            icon={<ArrowRight className="h-3.5 w-3.5" />}
            items={followUps}
            emptyText={content?.followUpsSummary || 'No follow-ups tracked'}
            renderItem={t => (
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs leading-relaxed">{t.title}</p>
                <button onClick={() => completeTask.mutate(t.id)} className="flex-shrink-0 text-muted-foreground hover:text-green-600 transition-colors mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          />

          <TrackerCard
            title="Waiting For"
            icon={<Users className="h-3.5 w-3.5" />}
            items={waitingFor}
            emptyText={content?.waitingForSummary || 'Nothing pending from others'}
            renderItem={t => (
              <div>
                <p className="text-xs leading-relaxed">{t.title}</p>
                {t.waitingFrom && <p className="text-[10px] text-muted-foreground mt-0.5">from {t.waitingFrom}</p>}
              </div>
            )}
          />

        </div>
      </section>

      {/* Quiet period message if nothing needs attention */}
      {!briefLoading && content && (content.requiresAttention?.length ?? 0) === 0 && (content.decisionsNeeded?.length ?? 0) === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
          <p className="text-sm font-medium">Your assistant has everything under control.</p>
          <p className="text-xs mt-1">No decisions needed. No urgent items. You&apos;re clear.</p>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
      {count !== undefined && count > 0 && (
        <span className="text-xs bg-foreground/10 text-foreground px-1.5 py-0.5 rounded-full font-medium">{count}</span>
      )}
    </div>
  )
}

function TrackerCard<T extends { id: string }>({
  title, icon, items, emptyText, renderItem
}: {
  title: string; icon: React.ReactNode; items: T[]
  emptyText: string; renderItem: (item: T) => React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-xs font-semibold">{title}</p>
        {items.length > 0 && (
          <span className="ml-auto text-xs bg-foreground/10 px-1.5 py-0.5 rounded-full">{items.length}</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground leading-relaxed">{emptyText}</p>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 4).map(item => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
          {items.length > 4 && (
            <p className="text-[10px] text-muted-foreground">+{items.length - 4} more</p>
          )}
        </div>
      )}
    </div>
  )
}

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
