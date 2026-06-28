'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface IntelRecommendationItem {
  id: string
  source: 'signal' | 'action'
  category: string
  title: string
  reason: string
  action: string
  businessImpact: string
  urgency: 'critical' | 'high' | 'normal'
  preparedBy: string
  messageSubject?: string | null
  messageFrom?: string | null
}

interface Props {
  item: IntelRecommendationItem
  onAct?: (id: string) => void
  onDismiss?: (id: string) => void
}

const URGENCY_ACCENT: Record<IntelRecommendationItem['urgency'], string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-400',
  normal: 'border-l-border',
}

const URGENCY_DOT: Record<IntelRecommendationItem['urgency'], string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  normal: 'bg-muted-foreground/30',
}

export function IntelRecommendationCard({ item, onAct, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden border-l-4',
        URGENCY_ACCENT[item.urgency]
      )}
    >
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {item.category}
          </span>
          <span
            className={cn(
              'h-2 w-2 rounded-full flex-shrink-0',
              URGENCY_DOT[item.urgency]
            )}
            title={item.urgency}
          />
        </div>

        {/* Title */}
        <p className="text-sm font-semibold leading-snug text-foreground">
          {item.title}
        </p>

        {/* Reason (1 line collapsed) */}
        <p
          className={cn(
            'text-xs text-muted-foreground leading-relaxed',
            !expanded && 'line-clamp-1'
          )}
        >
          {item.reason}
        </p>

        {/* Action line */}
        <p className="text-xs font-medium text-primary">
          → {item.action}
        </p>

        {/* Message context */}
        {item.messageFrom && (
          <p className="text-[11px] text-muted-foreground">
            Re:{' '}
            {item.messageSubject ? (
              <span className="italic">{item.messageSubject}</span>
            ) : null}{' '}
            from {item.messageFrom}
          </p>
        )}

        {/* Expanded: business impact */}
        {expanded && (
          <div className="mt-1 rounded-lg border-l-2 border-l-orange-400 bg-orange-50/30 px-3 py-2 space-y-0.5">
            <p className="text-[10px] font-semibold text-orange-600/80 uppercase tracking-wider">
              Business Impact
            </p>
            <p className="text-xs text-foreground/80 leading-relaxed">
              {item.businessImpact}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t bg-muted/20">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAct?.(item.id)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Act on this
          </button>
          <button
            type="button"
            onClick={() => onDismiss?.(item.id)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Dismiss
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            Prepared by {item.preparedBy}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
