'use client'
import { useState } from 'react'
import { CheckCircle2, Clock, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DecisionOutcome {
  id: string
  title: string
  category: string
  escalation: 'critical' | 'urgent' | 'important'
  status: 'approved' | 'deferred' | 'changes_requested'
  decidedAt: string
  createdAt: string
  hoursToDecide: number
  statusNote?: string | null
  recommendation: string
  preparedBy: string
}

export interface DecisionOutcomeCardProps {
  outcome: DecisionOutcome
}

// ─── Visual config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  approved: {
    Icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    label: 'Approved',
  },
  deferred: {
    Icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    label: 'Deferred',
  },
  changes_requested: {
    Icon: MessageSquare,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    label: 'Sent back',
  },
} as const

const CATEGORY_STYLES: Record<string, string> = {
  Strategic:   'bg-blue-50 text-blue-600 border-blue-200',
  Financial:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  Operational: 'bg-violet-50 text-violet-600 border-violet-200',
  People:      'bg-rose-50 text-rose-600 border-rose-200',
  External:    'bg-amber-50 text-amber-700 border-amber-200',
}

const CATEGORY_FALLBACK = 'bg-muted text-muted-foreground border-border'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeToDecide(hours: number): string {
  if (hours > 48) {
    const days = Math.round(hours / 24)
    return `${days}d`
  }
  return `${Math.round(hours)}h`
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DecisionOutcomeCard({ outcome }: DecisionOutcomeCardProps) {
  const [expanded, setExpanded] = useState(false)

  const { Icon, color, bg, label } = STATUS_CONFIG[outcome.status]
  const categoryStyle = CATEGORY_STYLES[outcome.category] ?? CATEGORY_FALLBACK
  const timeLabel = formatTimeToDecide(outcome.hoursToDecide)

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Status header bar */}
      <div className={cn('flex items-center gap-2 px-4 py-2 border-b', bg)}>
        <Icon className={cn('h-4 w-4 shrink-0', color)} />
        <span className={cn('text-xs font-semibold', color)}>{label}</span>
      </div>

      {/* Card body */}
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <p className="text-sm font-medium leading-snug">{outcome.title}</p>

          {/* Two-column row: category + time-to-decide */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                categoryStyle,
              )}
            >
              {outcome.category}
            </span>
            <span className="text-[11px] text-muted-foreground">
              decided in {timeLabel}
            </span>
          </div>
        </div>

        {/* Expand toggle */}
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Expandable section */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {/* Recommendation */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Recommendation
            </p>
            <p className="text-xs text-foreground leading-relaxed">{outcome.recommendation}</p>
          </div>

          {/* Status note */}
          {outcome.statusNote && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Note
              </p>
              <p className="text-xs text-foreground leading-relaxed">{outcome.statusNote}</p>
            </div>
          )}

          {/* Prepared by */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Prepared by</span>
            <span className="text-[11px] font-medium text-foreground">{outcome.preparedBy}</span>
          </div>
        </div>
      )}
    </div>
  )
}
