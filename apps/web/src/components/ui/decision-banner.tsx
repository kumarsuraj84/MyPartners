'use client'

import { Scale } from 'lucide-react'
import { cn } from '@/lib/utils'

type DecisionBannerProps = {
  count: number
  onView?: () => void
}

export function DecisionBanner({ count, onView }: DecisionBannerProps) {
  return (
    <div className="rounded-xl bg-primary/8 border border-primary/20 px-4 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary/10">
          <Scale className="h-3.5 w-3.5 text-primary" />
        </span>
        <p className="text-sm font-medium text-foreground/90">
          Your office has prepared{' '}
          <span className="font-semibold text-primary tabular-nums">{count}</span>{' '}
          {count === 1 ? 'decision' : 'decisions'} for your review.
        </p>
      </div>
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="flex-shrink-0 text-xs font-semibold text-primary hover:text-primary/70 transition-colors whitespace-nowrap"
        >
          Review now →
        </button>
      )}
    </div>
  )
}
