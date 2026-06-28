'use client'

import { Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WaitingForItem {
  id: string
  title: string
  waitingFrom: string
  daysWaiting: number
  dueDate: string | null
  isOverdue: boolean
  priority: string
  context: string | null
  personRole: string | null
  personCompany: string | null
}

interface WaitingForCardProps {
  item: WaitingForItem
  onNudge?: (id: string) => void
  onMark?: (id: string) => void
}

export function WaitingForCard({ item, onNudge, onMark }: WaitingForCardProps) {
  const accentClass = item.isOverdue
    ? 'border-l-2 border-l-red-500'
    : item.daysWaiting > 7
      ? 'border-l-2 border-l-amber-400'
      : ''

  const hasSubrow = item.personRole || item.personCompany

  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden', accentClass)}>
      {/* Header */}
      <div className="px-4 pt-3.5 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground leading-snug">
            {item.waitingFrom}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-muted/60 text-muted-foreground border-border">
            {item.daysWaiting === 1 ? 'since 1 day' : `since ${item.daysWaiting} days`}
          </span>
          {item.isOverdue && (
            <span className="inline-flex items-center text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
              Overdue
            </span>
          )}
        </div>

        {hasSubrow && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {[item.personRole, item.personCompany].filter(Boolean).join(' @ ')}
          </p>
        )}

        <p className="text-sm text-foreground/80 leading-relaxed mt-1">{item.title}</p>

        {item.context && (
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{item.context}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 pt-2 flex items-center gap-2">
        <button
          onClick={() => onNudge?.(item.id)}
          className="h-7 px-3 rounded-md text-xs font-medium border border-border text-foreground hover:bg-accent transition-colors flex items-center gap-1.5"
        >
          <Clock className="h-3 w-3" />
          Nudge
        </button>
        <button
          onClick={() => onMark?.(item.id)}
          className="h-7 px-3 rounded-md text-xs font-medium border border-border text-foreground hover:bg-accent transition-colors flex items-center gap-1.5"
        >
          <CheckCircle2 className="h-3 w-3" />
          Received
        </button>
      </div>
    </div>
  )
}
