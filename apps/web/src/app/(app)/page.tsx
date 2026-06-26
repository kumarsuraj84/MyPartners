'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, ArrowRight, Users, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface Brief {
  id: string
  content: {
    greeting: string
    situationSummary: string[]
    requiresAttention: { title: string; description: string; urgency: 'critical' | 'high' | 'normal'; source: string }[]
    decisionsNeeded: { title: string; context: string; deadline?: string }[]
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
    }
  }
}

interface Task {
  id: string; title: string; category: string; priority: string; dueDate?: string; waitingFrom?: string
}

interface SuggestedAction {
  id: string; label: string; type: string; detail?: string
  message: { subject?: string; fromName?: string; fromAddress: string }
}

const ACTION_LABELS: Record<string, string> = {
  reply: 'Reply',
  delegate: 'Delegate',
  schedule: 'Schedule',
  follow_up: 'Track',
  archive: 'Archive',
  create_task: 'Add to tasks',
}

export default function HomePage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: brief, isLoading } = useQuery<Brief>({
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
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const greeting = content?.greeting
    ? content.greeting.replace('{name}', firstName)
    : `Good ${timeOfDay()}, ${firstName}`

  if (isLoading) return <HomeSkeletonLoader />

  const hasAttentionItems =
    (content?.requiresAttention?.length ?? 0) > 0 ||
    (content?.decisionsNeeded?.length ?? 0) > 0

  return (
    <div className="animate-fade-in max-w-2xl space-y-10 pb-16">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      {/* Situation summary — first-person CoS narrative, right after greeting */}
      {(content?.situationSummary?.length ?? 0) > 0 && (
        <section className="space-y-1">
          {content!.situationSummary.map((line, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>
          ))}
        </section>
      )}

      {/* Top priority */}
      {content?.topPriority && (
        <div className="px-4 py-3.5 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-[11px] font-semibold text-primary/80 uppercase tracking-wider mb-1">Focus</p>
          <p className="text-sm font-medium text-foreground">{content.topPriority}</p>
        </div>
      )}

      {/* Requires attention */}
      {(content?.requiresAttention?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <Label>Needs your attention</Label>
          {content!.requiresAttention.map((item, i) => (
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
                <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  item.urgency === 'critical' ? 'text-red-500' :
                  item.urgency === 'high' ? 'text-orange-400' : 'text-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Decisions */}
      {(content?.decisionsNeeded?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <Label>Decisions today</Label>
          {content!.decisionsNeeded.map((d, i) => (
            <div key={i} className="px-4 py-3.5 rounded-xl border bg-card">
              <p className="text-sm font-medium leading-snug">{d.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.context}</p>
              {d.deadline && (
                <p className="text-xs text-orange-600 mt-2 font-medium">{d.deadline}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Suggested actions */}
      {suggestedActions.length > 0 && (
        <section className="space-y-2">
          <Label>Suggested next</Label>
          {suggestedActions.slice(0, 5).map(action => (
            <div key={action.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {action.message.subject ?? action.message.fromName ?? action.message.fromAddress}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => dismissAction.mutate(action.id)}
                  className="h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => actOnAction.mutate(action.id)}
                  className="h-7 px-2.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {ACTION_LABELS[action.type] ?? 'Act'}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Three-column tracker */}
      <section>
        <Label>In motion</Label>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <TrackerCard
            title="Commitments"
            icon={<Calendar className="h-3.5 w-3.5" />}
            items={commitments}
            emptyText={content?.commitmentsSummary ?? 'None pending'}
            renderItem={t => (
              <div className="flex items-start justify-between gap-2 group">
                <p className="text-xs leading-relaxed text-foreground/80">{t.title}</p>
                <button
                  onClick={() => completeTask.mutate(t.id)}
                  className="flex-shrink-0 text-muted-foreground hover:text-green-600 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                  title="Mark done"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          />

          <TrackerCard
            title="Follow-ups"
            icon={<ArrowRight className="h-3.5 w-3.5" />}
            items={followUps}
            emptyText={content?.followUpsSummary ?? 'Nothing tracked'}
            renderItem={t => (
              <div className="flex items-start justify-between gap-2 group">
                <p className="text-xs leading-relaxed text-foreground/80">{t.title}</p>
                <button
                  onClick={() => completeTask.mutate(t.id)}
                  className="flex-shrink-0 text-muted-foreground hover:text-green-600 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                  title="Mark done"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          />

          <TrackerCard
            title="Waiting for"
            icon={<Users className="h-3.5 w-3.5" />}
            items={waitingFor}
            emptyText={content?.waitingForSummary ?? 'Nothing pending'}
            renderItem={t => (
              <div>
                <p className="text-xs leading-relaxed text-foreground/80">{t.title}</p>
                {t.waitingFrom && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.waitingFrom}</p>
                )}
              </div>
            )}
          />
        </div>
      </section>

      {/* Clear state */}
      {!isLoading && !hasAttentionItems && suggestedActions.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle2 className="h-7 w-7 mx-auto mb-2.5 text-green-500 opacity-50" />
          <p className="text-sm font-medium text-foreground/70">Nothing needs your attention right now.</p>
          <p className="text-xs text-muted-foreground mt-1">Everything is moving as expected.</p>
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

function TrackerCard<T extends { id: string }>({
  title, icon, items, emptyText, renderItem,
}: {
  title: string
  icon: React.ReactNode
  items: T[]
  emptyText: string
  renderItem: (item: T) => React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-muted-foreground/60">{icon}</span>
        <p className="text-xs font-semibold text-foreground/70">{title}</p>
        {items.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground font-medium">{items.length}</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 leading-relaxed">{emptyText}</p>
      ) : (
        <div className="space-y-2">
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

function HomeSkeletonLoader() {
  return (
    <div className="max-w-2xl space-y-10 pb-16 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-56 bg-muted rounded-lg" />
        <div className="h-4 w-36 bg-muted rounded" />
      </div>
      <div className="h-14 bg-muted rounded-xl" />
      <div className="space-y-2">
        <div className="h-3 w-32 bg-muted rounded" />
        <div className="h-16 bg-muted rounded-xl" />
        <div className="h-16 bg-muted rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-28 bg-muted rounded-xl" />
        <div className="h-28 bg-muted rounded-xl" />
        <div className="h-28 bg-muted rounded-xl" />
      </div>
    </div>
  )
}

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
