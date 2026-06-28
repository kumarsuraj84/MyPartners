'use client'

import { format } from 'date-fns'
import { ActionHistoryCard } from './ActionHistoryCard'

interface ActionHistoryItem {
  id: string
  actionType: string
  label: string
  status: string
  createdAt: string
  completedAt?: string
  reversible: boolean
  reversed: boolean
}

interface ActionExecutionTimelineProps {
  items: ActionHistoryItem[]
  onReversed?: () => void
}

function groupByDay(items: ActionHistoryItem[]): Map<string, ActionHistoryItem[]> {
  const map = new Map<string, ActionHistoryItem[]>()
  for (const item of items) {
    const day = format(new Date(item.createdAt), 'MMM d, yyyy')
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(item)
  }
  return map
}

export function ActionExecutionTimeline({ items, onReversed }: ActionExecutionTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No actions taken yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Your office will log every action here.</p>
      </div>
    )
  }

  const grouped = groupByDay(items)

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([day, dayItems]) => (
        <div key={day}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{day}</p>
          <div className="rounded-xl border bg-card px-4">
            {dayItems.map((item) => (
              <ActionHistoryCard key={item.id} item={item} onReversed={onReversed} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
