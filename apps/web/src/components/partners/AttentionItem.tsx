'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, Info, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { AttentionItemData } from '@/data/partners'

interface AttentionItemProps {
  item: AttentionItemData
}

export function AttentionItem({ item }: AttentionItemProps) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const dismissMutation = useMutation({
    mutationFn: () => api.post(`/api/signals/${item.id}/dismiss`),
  })

  function handleDismiss() {
    setDismissed(true)
    dismissMutation.mutate()
  }

  if (dismissed) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-2.5 flex items-center gap-2 opacity-40">
        <X className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <p className="text-xs text-muted-foreground line-through">{item.title}</p>
      </div>
    )
  }

  const isHigh = item.urgency === 'high'

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      isHigh ? 'border-red-200 bg-red-50/30' : 'border-border bg-card'
    )}>
      <div className="px-4 py-3.5 flex items-start gap-3">
        {isHigh
          ? <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          : <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        }

        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-left w-full group"
          >
            <p className={cn(
              'text-sm font-medium leading-snug',
              isHigh ? 'text-red-800' : 'text-foreground'
            )}>
              {item.title}
            </p>
            {!expanded && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.reason}</p>
            )}
          </button>

          {expanded && (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
              <div className="flex items-start gap-1.5 mt-1">
                <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                  What to do
                </span>
                <p className={cn(
                  'text-xs font-medium leading-relaxed',
                  isHigh ? 'text-red-700' : 'text-foreground'
                )}>
                  {item.actionNeeded}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-muted-foreground/60">
              Flagged by {item.partnerName}
            </span>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Less' : 'Details'}
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-0.5"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
