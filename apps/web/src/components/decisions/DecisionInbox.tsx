'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DecisionCard } from './DecisionCard'
import { filterDecisions, countByFilter } from '@/data/decisions'
import type { Decision, DecisionFilter } from '@/data/decisions'
import { CheckCircle2 } from 'lucide-react'

const FILTER_LABELS: Record<DecisionFilter, string> = {
  urgent:  'Urgent',
  today:   'Today',
  waiting: 'Waiting',
  all:     'All',
}

interface DecisionInboxProps {
  decisions: Decision[]
}

export function DecisionInbox({ decisions }: DecisionInboxProps) {
  const [activeFilter, setActiveFilter] = useState<DecisionFilter>('all')

  const counts   = countByFilter(decisions)
  const filtered = filterDecisions(decisions, activeFilter)

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border w-fit">
        {(['urgent', 'today', 'waiting', 'all'] as DecisionFilter[]).map(filter => {
          const count   = counts[filter]
          const isActive = filter === activeFilter

          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-all',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {FILTER_LABELS[filter]}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold tabular-nums px-1 py-px rounded-full min-w-[16px] text-center',
                  isActive
                    ? filter === 'urgent'
                      ? 'bg-red-100 text-red-600'
                      : filter === 'today'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-primary/10 text-primary'
                    : 'bg-muted-foreground/15 text-muted-foreground',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Decision list */}
      {filtered.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-8 rounded-xl border bg-card text-center justify-center">
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            No {activeFilter === 'all' ? '' : FILTER_LABELS[activeFilter].toLowerCase() + ' '}decisions pending.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(d => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
      )}
    </div>
  )
}
