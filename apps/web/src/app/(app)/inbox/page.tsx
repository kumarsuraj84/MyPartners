'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Archive, Zap, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Message {
  id: string; fromName?: string; fromAddress: string; subject?: string; body: string
  summary?: string; priority: string; isRead: boolean; isArchived: boolean
  receivedAt: string; provider: string; actionItems?: string[]
}

interface MessagesResponse {
  messages: Message[]; total: number; page: number; pages: number
}

const PRIORITY_VARIANTS: Record<string, 'urgent' | 'high' | 'normal' | 'low'> = {
  urgent: 'urgent', high: 'high', normal: 'normal', low: 'low',
}

export default function InboxPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('')
  const [selected, setSelected] = useState<Message | null>(null)

  const { data, isLoading } = useQuery<MessagesResponse>({
    queryKey: ['messages', { search, filter }],
    queryFn: () => api.get(`/api/messages?${new URLSearchParams({ ...(search ? { search } : {}), ...(filter ? { priority: filter } : {}) }).toString()}`),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/messages/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  })

  const archive = useMutation({
    mutationFn: (id: string) => api.patch(`/api/messages/${id}/archive`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); setSelected(null) },
  })

  const summarize = useMutation({
    mutationFn: (id: string) => api.post<Message>(`/api/messages/${id}/summarize`),
    onSuccess: (msg) => { qc.invalidateQueries({ queryKey: ['messages'] }); setSelected(msg) },
  })

  const handleOpen = (msg: Message) => {
    setSelected(msg)
    if (!msg.isRead) markRead.mutate(msg.id)
  }

  return (
    <div className="animate-fade-in h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Unified Inbox</h1>
        <p className="text-muted-foreground mt-1">All communications in one place</p>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages..." className="w-full pl-9 pr-4 h-9 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        {['urgent', 'high', 'normal', 'low'].map(p => (
          <button key={p} onClick={() => setFilter(filter === p ? '' : p)} className={`px-3 h-9 rounded-md text-xs font-medium border transition-colors ${filter === p ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Message list */}
        <div className="w-80 flex-shrink-0 overflow-y-auto space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))
          ) : data?.messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            data?.messages.map(msg => (
              <button key={msg.id} onClick={() => handleOpen(msg)} className={`w-full text-left p-3 rounded-lg border transition-colors ${selected?.id === msg.id ? 'bg-primary/10 border-primary/30' : 'bg-card hover:bg-accent/50'} ${!msg.isRead ? 'font-medium' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm truncate">{msg.fromName || msg.fromAddress}</span>
                  <Badge variant={PRIORITY_VARIANTS[msg.priority] || 'normal'} className="text-[10px] px-1.5 py-0">{msg.priority}</Badge>
                </div>
                <p className="text-xs font-medium truncate">{msg.subject || '(no subject)'}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{msg.summary || msg.body.slice(0, 80)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(msg.receivedAt))} ago</p>
              </button>
            ))
          )}
        </div>

        {/* Message detail */}
        <div className="flex-1 rounded-xl border bg-card overflow-y-auto">
          {selected ? (
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selected.subject || '(no subject)'}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">From: {selected.fromName || selected.fromAddress}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => summarize.mutate(selected.id)} disabled={summarize.isPending}>
                    <Zap className="h-3.5 w-3.5 mr-1.5" />{summarize.isPending ? 'Analyzing...' : 'AI Summary'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => archive.mutate(selected.id)}>
                    <Archive className="h-3.5 w-3.5 mr-1.5" />Archive
                  </Button>
                </div>
              </div>

              {selected.summary && (
                <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">AI Summary</p>
                  <p className="text-sm">{selected.summary}</p>
                  {(selected.actionItems as string[] | undefined)?.length ? (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Action Items</p>
                      <ul className="space-y-0.5">
                        {(selected.actionItems as string[]).map((item, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap">{selected.body}</div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
