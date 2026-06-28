'use client'

import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutomationPreferenceCardProps {
  title: string
  description: string
  enabled: boolean
  onToggle: () => void
  count?: number
  saving?: boolean
}

export function AutomationPreferenceCard({
  title,
  description,
  enabled,
  onToggle,
  count,
  saving,
}: AutomationPreferenceCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 flex items-start gap-4 cursor-pointer transition-colors',
        enabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'hover:border-border/60'
      )}
      onClick={onToggle}
    >
      <div
        className={cn(
          'mt-0.5 rounded-lg p-2',
          enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
        )}
      >
        <Zap className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{title}</p>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground">{count} handled</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div
        className={cn(
          'mt-0.5 flex-shrink-0 w-9 h-5 rounded-full transition-colors relative',
          enabled ? 'bg-emerald-500' : 'bg-muted',
          saving && 'opacity-50'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            enabled && 'translate-x-4'
          )}
        />
      </div>
    </div>
  )
}
