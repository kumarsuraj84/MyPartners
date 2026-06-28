'use client'

import { Clock, Send } from 'lucide-react'

export interface WaitingForItem {
  id: string
  title: string
  owner: string
  dueDate: string
  daysUntilDue: number
  isOverdue: boolean
  context: string
}

interface WaitingForCardProps {
  item: WaitingForItem
  onNudge?: (id: string) => void
  onMark?: (id: string) => void
}

export function WaitingForCard({ item, onNudge, onMark }: WaitingForCardProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${
        item.isOverdue
          ? 'border-orange-200 bg-orange-50/30'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <Clock
          className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
            item.isOverdue ? 'text-orange-400' : 'text-muted-foreground'
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{item.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.owner} · {item.isOverdue ? `${Math.abs(item.daysUntilDue)}d overdue` : `due ${item.dueDate}`}
          </p>
          {item.context && (
            <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed line-clamp-2">
              {item.context}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            {onNudge && (
              <button
                onClick={() => onNudge(item.id)}
                className="flex items-center gap-1 h-6 px-2 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Send className="h-3 w-3" />
                Nudge
              </button>
            )}
            {onMark && (
              <button
                onClick={() => onMark(item.id)}
                className="h-6 px-2 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Mark received
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
