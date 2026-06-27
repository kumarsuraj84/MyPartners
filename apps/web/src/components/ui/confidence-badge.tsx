'use client'

import { cn } from '@/lib/utils'

type ConfidenceBadgeProps = {
  level: 'high' | 'medium' | 'low' | 'needs-review'
  note?: string
}

const LEVEL_CONFIG = {
  high: {
    bars: 3,
    filledColor: 'bg-emerald-500',
    label: 'High Confidence',
  },
  medium: {
    bars: 2,
    filledColor: 'bg-amber-400',
    label: 'Medium Confidence',
  },
  low: {
    bars: 1,
    filledColor: 'bg-orange-400',
    label: 'Needs Review',
  },
  'needs-review': {
    bars: 1,
    filledColor: 'bg-orange-400',
    label: 'Needs Review',
  },
} as const

export function ConfidenceBadge({ level, note }: ConfidenceBadgeProps) {
  const config = LEVEL_CONFIG[level]

  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3].map(i => (
          <span
            key={i}
            className={cn(
              'h-2 w-5 rounded-sm',
              i <= config.bars ? config.filledColor : 'bg-muted'
            )}
          />
        ))}
      </span>
      <span className="text-[11px] font-semibold text-foreground/70">
        {config.label}
      </span>
      {note && (
        <span className="text-[11px] text-muted-foreground">{note}</span>
      )}
    </span>
  )
}
