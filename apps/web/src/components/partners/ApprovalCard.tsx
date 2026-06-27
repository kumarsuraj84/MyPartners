'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Check, X, MessageSquare, Send, RotateCcw, Calendar, Lightbulb, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { ApprovalItem, ApprovalType } from '@/data/partners'

type CardState = 'pending' | 'approved' | 'changes_requested' | 'dismissed'

const TYPE_CONFIG: Record<ApprovalType, { label: string; Icon: React.ElementType; accent: string; badge: string }> = {
  draft_response: {
    label: 'Draft Response',
    Icon: Send,
    accent: 'text-violet-600',
    badge: 'bg-violet-50 text-violet-600 border-violet-200',
  },
  follow_up: {
    label: 'Follow-up',
    Icon: RotateCcw,
    accent: 'text-orange-600',
    badge: 'bg-orange-50 text-orange-600 border-orange-200',
  },
  meeting_brief: {
    label: 'Meeting Brief',
    Icon: Calendar,
    accent: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  recommendation: {
    label: 'Recommendation',
    Icon: Lightbulb,
    accent: 'text-primary',
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
}

interface ApprovalCardProps {
  item: ApprovalItem
}

export function ApprovalCard({ item }: ApprovalCardProps) {
  const [state, setState] = useState<CardState>('pending')
  const [expanded, setExpanded] = useState(false)

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/api/approvals/${item.id}/approve`),
  })

  const dismissMutation = useMutation({
    mutationFn: () => api.post(`/api/approvals/${item.id}/dismiss`),
  })

  function handleApprove() {
    setState('approved')
    approveMutation.mutate()
  }

  function handleChangesRequested() {
    setState('changes_requested')
  }

  function handleDismiss() {
    setState('dismissed')
    dismissMutation.mutate()
  }

  const config = TYPE_CONFIG[item.type]
  const { Icon } = config

  if (state === 'dismissed') {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 flex items-center gap-3 opacity-50">
        <X className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <p className="text-xs text-muted-foreground line-through">{item.title}</p>
      </div>
    )
  }

  if (state === 'approved') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50/40 px-4 py-3 flex items-center gap-3">
        <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-green-700">{item.title}</p>
          <p className="text-[11px] text-green-600/70 mt-0.5">Taken Care Of · {item.subject}</p>
        </div>
        <span className="text-[10px] font-semibold text-green-600 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full flex-shrink-0">
          Approved
        </span>
      </div>
    )
  }

  if (state === 'changes_requested') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 flex items-center gap-3">
        <MessageSquare className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-700">{item.title}</p>
          <p className="text-[11px] text-amber-600/70 mt-0.5">Changes requested · sent back to {item.preparedBy}</p>
        </div>
        <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">
          In revision
        </span>
      </div>
    )
  }

  // pending state
  return (
    <div className={cn(
      'rounded-xl border bg-card overflow-hidden',
      item.urgency === 'urgent' && 'border-l-2 border-l-orange-400'
    )}>
      {/* Header */}
      <div className="px-4 py-3.5 flex items-start gap-3">
        <div className={cn('h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 bg-muted/60')}>
          <Icon className={cn('h-3.5 w-3.5', config.accent)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-snug flex-1">{item.title}</p>
            {item.urgency === 'urgent' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                <AlertCircle className="h-2.5 w-2.5" />
                Urgent
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', config.badge)}>
              {config.label}
            </span>
            <span className="text-[11px] text-muted-foreground">{item.subject}</span>
          </div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          aria-label={expanded ? 'Collapse preview' : 'Preview'}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Preview */}
      {expanded && (
        <div className="mx-4 mb-3.5 rounded-lg border bg-muted/30 px-3.5 py-3">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
            Prepared by {item.preparedBy} · {item.preparedAt}
          </p>
          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line font-mono">
            {item.preview}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-3.5 flex items-center gap-2">
        <button
          onClick={handleApprove}
          className="h-7 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
        >
          <Check className="h-3 w-3" />
          Approve
        </button>
        <button
          onClick={handleChangesRequested}
          className="h-7 px-3 rounded-md text-xs font-medium border border-border text-foreground hover:bg-accent transition-colors flex items-center gap-1.5"
        >
          <MessageSquare className="h-3 w-3" />
          Request changes
        </button>
        <button
          onClick={handleDismiss}
          className="h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-auto"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
