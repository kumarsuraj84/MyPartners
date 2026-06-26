'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, Archive, ChevronDown, ChevronUp, Search, CheckCircle2, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SuggestedAction {
  id: string; label: string; type: string; detail?: string
}

interface Message {
  id: string
  fromName?: string
  fromAddress: string
  subject?: string
  body: string
  summary?: string
  priority: string
  priorityReason?: string
  messageCategory?: string
  isRead: boolean
  isArchived: boolean
  receivedAt: string
  provider: string
  actionItems?: string[]
  metadata?: { whyItMatters?: string; entities?: Array<{ name: string; type: string; context: string }> }
  aiProcessed: boolean
  suggestedActions: SuggestedAction[]
}

interface MessagesResponse {
  messages: Message[]; total: number
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

const CATEGORY_LABELS: Record<string, string> = {
  request: 'Request',
  update: 'Update',
  fyi: 'FYI',
  decision: 'Decision',
  commitment: 'Commitment',
  introduction: 'Introduction',
}

const ACTION_VERB: Record<string, string> = {
  reply: 'Reply',
  delegate: 'Delegate',
  schedule: 'Schedule',
  follow_up: 'Track',
  archive: 'Done with this',
  create_task: 'Add to work',
}

export default function CommunicationPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showBody, setShowBody] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery<MessagesResponse>({
    queryKey: ['messages', search],
    queryFn: () => api.get(`/api/messages?${search ? `search=${encodeURIComponent(search)}` : ''}`),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/messages/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  })

  const archive = useMutation({
    mutationFn: (id: string) => api.patch(`/api/messages/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] })
      qc.invalidateQueries({ queryKey: ['ai', 'activity'] })
    },
  })

  const processAI = useMutation({
    mutationFn: (id: string) => api.post(`/api/ai/process-message/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] })
      qc.invalidateQueries({ queryKey: ['actions'] })
      qc.invalidateQueries({ queryKey: ['brief'] })
    },
  })

  const dismissAction = useMutation({
    mutationFn: (id: string) => api.patch(`/api/actions/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  })

  const actOnAction = useMutation({
    mutationFn: (id: string) => api.patch(`/api/actions/${id}/act`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] })
      qc.invalidateQueries({ queryKey: ['actions'] })
    },
  })

  const toggleExpand = (id: string, msg: Message) => {
    const next = new Set(expanded)
    if (next.has(id)) { next.delete(id) } else {
      next.add(id)
      if (!msg.isRead) markRead.mutate(id)
    }
    setExpanded(next)
  }

  const toggleBody = (id: string) => {
    const next = new Set(showBody)
    if (next.has(id)) { next.delete(id) } else { next.add(id) }
    setShowBody(next)
  }

  const messages = [...(data?.messages ?? [])].sort((a, b) => {
    if (!a.isRead && b.isRead) return -1
    if (a.isRead && !b.isRead) return 1
    return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  })

  const urgentCount = messages.filter(m => m.priority === 'urgent' && !m.isRead).length
  const unreadCount = messages.filter(m => !m.isRead).length

  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Communication</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {urgentCount > 0
            ? `${urgentCount} urgent · ${unreadCount} need your attention`
            : unreadCount > 0
            ? `${unreadCount} waiting for you`
            : "You're up to date"}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your messages…"
          className="w-full pl-9 pr-4 h-9 rounded-lg border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-50" />
          <p className="text-sm font-medium">You're up to date.</p>
          <p className="text-xs mt-1">Connect your inbox in Settings to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map(msg => {
            const isOpen = expanded.has(msg.id)
            const seeingBody = showBody.has(msg.id)
            const whyItMatters = msg.metadata?.whyItMatters

            return (
              <div
                key={msg.id}
                className={`rounded-xl border transition-all ${
                  msg.priority === 'urgent' && !msg.isRead
                    ? 'border-red-200 bg-red-50/30'
                    : msg.priority === 'high' && !msg.isRead
                    ? 'border-orange-200 bg-orange-50/20'
                    : isOpen
                    ? 'border-primary/20 bg-card'
                    : 'border-border bg-card'
                } ${!msg.isRead ? 'shadow-sm' : ''}`}
              >
                {/* Header */}
                <button
                  className="w-full text-left p-4 flex items-start gap-3"
                  onClick={() => toggleExpand(msg.id, msg)}
                >
                  <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                    !msg.isRead
                      ? msg.priority === 'urgent' ? 'bg-red-500'
                      : msg.priority === 'high' ? 'bg-orange-500'
                      : 'bg-blue-500'
                    : 'bg-transparent'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-sm ${!msg.isRead ? 'font-semibold' : 'font-medium'}`}>
                        {msg.fromName || msg.fromAddress}
                      </span>

                      {/* Message category — what kind of communication */}
                      {msg.messageCategory && CATEGORY_LABELS[msg.messageCategory] && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {CATEGORY_LABELS[msg.messageCategory]}
                        </span>
                      )}

                      {/* Priority — only show urgent/high */}
                      {(msg.priority === 'urgent' || msg.priority === 'high') && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          msg.priority === 'urgent' ? 'text-red-700 bg-red-100' : 'text-orange-700 bg-orange-100'
                        }`}>
                          {msg.priority}
                        </span>
                      )}

                      <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(msg.receivedAt))} ago
                      </span>
                    </div>

                    <p className={`text-sm ${!msg.isRead ? 'text-foreground' : 'text-muted-foreground'} truncate`}>
                      {msg.subject ?? '(no subject)'}
                    </p>

                    {/* Summary preview when collapsed */}
                    {!isOpen && msg.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{msg.summary}</p>
                    )}

                    {/* Why it matters — show collapsed if not processed yet */}
                    {!isOpen && !msg.aiProcessed && (
                      <p className="text-xs text-muted-foreground/60 mt-1 italic">Not yet reviewed by your assistant</p>
                    )}
                  </div>

                  {isOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  }
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t pt-3">

                    {/* Not yet processed */}
                    {!msg.aiProcessed ? (
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-muted-foreground flex-1">Your assistant hasn't reviewed this yet.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs flex-shrink-0"
                          onClick={() => processAI.mutate(msg.id)}
                          disabled={processAI.isPending}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {processAI.isPending ? 'Reviewing…' : 'Review now'}
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Why it matters */}
                        {whyItMatters && (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5">Why it matters</p>
                            <p className="text-sm leading-relaxed text-foreground/90">{whyItMatters}</p>
                          </div>
                        )}

                        {/* Summary */}
                        {msg.summary && (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5">Summary</p>
                            <p className="text-sm leading-relaxed">{msg.summary}</p>
                          </div>
                        )}

                        {/* Priority reason — only show if flagged high/urgent */}
                        {msg.priorityReason && (msg.priority === 'urgent' || msg.priority === 'high') && (
                          <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs ${
                            msg.priority === 'urgent' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                          }`}>
                            <span className="font-semibold flex-shrink-0">Why urgent:</span>
                            <span>{msg.priorityReason}</span>
                          </div>
                        )}

                        {/* Action items */}
                        {(msg.actionItems as string[] | undefined)?.length ? (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5">Needs action</p>
                            <ul className="space-y-1">
                              {(msg.actionItems as string[]).map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {/* Suggested actions from intelligence pipeline */}
                        {msg.suggestedActions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {msg.suggestedActions.map(action => (
                              <div key={action.id} className="flex items-center gap-1">
                                <button
                                  onClick={() => dismissAction.mutate(action.id)}
                                  className="h-7 px-2 rounded-l-lg border text-xs text-muted-foreground hover:bg-accent transition-colors border-r-0"
                                  title="Dismiss"
                                >
                                  ×
                                </button>
                                <button
                                  onClick={() => actOnAction.mutate(action.id)}
                                  className="h-7 px-3 rounded-r-lg border text-xs font-medium hover:bg-accent transition-colors"
                                >
                                  {action.label || ACTION_VERB[action.type] || 'Act'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Full message toggle */}
                    <div>
                      <button
                        onClick={() => toggleBody(msg.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        {seeingBody ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {seeingBody ? 'Hide full message' : 'Read full message'}
                      </button>
                      {seeingBody && (
                        <div className="mt-3 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                          {msg.body}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => archive.mutate(msg.id)}
                        disabled={archive.isPending}
                      >
                        <Archive className="h-3 w-3 mr-1" />Done with this
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
