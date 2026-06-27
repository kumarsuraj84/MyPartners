'use client'

import { cn } from '@/lib/utils'

type TimelineEventProps = {
  time: string
  actor: string
  action: string
  details?: string
  type?: 'prepared' | 'reviewed' | 'flagged' | 'updated' | 'completed'
}

const TYPE_DOT: Record<NonNullable<TimelineEventProps['type']>, string> = {
  prepared: 'bg-blue-500',
  reviewed: 'bg-emerald-500',
  flagged: 'bg-red-500',
  updated: 'bg-violet-500',
  completed: 'bg-emerald-500',
}

const TYPE_ACTOR_STYLE: Record<NonNullable<TimelineEventProps['type']>, string> = {
  prepared: 'bg-blue-50 text-blue-700 border-blue-200/60',
  reviewed: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  flagged: 'bg-red-50 text-red-700 border-red-200/60',
  updated: 'bg-violet-50 text-violet-700 border-violet-200/60',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
}

export function TimelineEvent({ time, actor, action, details, type }: TimelineEventProps) {
  const dotClass = type ? TYPE_DOT[type] : 'bg-zinc-300'
  const actorClass = type
    ? TYPE_ACTOR_STYLE[type]
    : 'bg-muted text-muted-foreground border-border'

  return (
    <div className="flex items-start gap-3">
      <span className="w-20 flex-shrink-0 text-[11px] text-muted-foreground tabular-nums pt-0.5">
        {time}
      </span>
      <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0', dotClass)} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
              actorClass
            )}
          >
            {actor}
          </span>
          <span className="text-xs text-foreground/80">{action}</span>
        </div>
        {details && (
          <p className="text-[11px] text-muted-foreground leading-relaxed pl-0.5">
            {details}
          </p>
        )}
      </div>
    </div>
  )
}
