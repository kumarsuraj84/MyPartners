'use client'

import { cn } from '@/lib/utils'

type SectionHeaderProps = {
  title: string
  count?: number
  action?: () => void
  actionLabel?: string
}

export function SectionHeader({ title, count, action, actionLabel }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
          {title}
        </span>
        {count !== undefined && (
          <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">
            {count}
          </span>
        )}
      </div>
      {action && actionLabel && (
        <button
          onClick={action}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
