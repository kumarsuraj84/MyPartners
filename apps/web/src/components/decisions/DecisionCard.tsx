'use client'
import { useState } from 'react'
import {
  ChevronDown, ChevronUp, Check, MessageSquare, Clock,
  CheckCircle2, MinusCircle, Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfidenceBadge } from '@/components/ui/confidence-badge'
import { ImpactCard } from '@/components/ui/impact-card'
import type { Decision, DecisionCategory, EscalationLevel } from '@/data/decisions'

// ─── Visual config ────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<DecisionCategory, { badge: string }> = {
  Strategic:   { badge: 'bg-blue-50 text-blue-600 border-blue-200' },
  Financial:   { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Operational: { badge: 'bg-violet-50 text-violet-600 border-violet-200' },
  People:      { badge: 'bg-rose-50 text-rose-600 border-rose-200' },
  External:    { badge: 'bg-amber-50 text-amber-700 border-amber-200' },
}

const ESCALATION_STYLES: Record<EscalationLevel, { badge: string; border: string; label: string }> = {
  critical:  { badge: 'bg-red-50 text-red-600 border-red-200',     border: 'border-l-2 border-l-red-500',    label: 'Critical' },
  urgent:    { badge: 'bg-orange-50 text-orange-600 border-orange-200', border: 'border-l-2 border-l-orange-400', label: 'Urgent' },
  important: { badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-l-2 border-l-amber-400',  label: 'Important' },
}

// ─── Resolved states ──────────────────────────────────────────────────────────

function ResolvedRow({
  icon, label, sub, color,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  color: string
}) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 flex items-center gap-3', color)}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type CardState = 'pending' | 'approved' | 'changes_requested' | 'deferred'

interface DecisionCardProps {
  decision: Decision
}

export function DecisionCard({ decision: d }: DecisionCardProps) {
  const [state, setState]       = useState<CardState>('pending')
  const [expanded, setExpanded] = useState(false)

  const catStyle = CATEGORY_STYLES[d.category]
  const escStyle = ESCALATION_STYLES[d.escalation]

  // ── Confidence level mapping ─────────────────────────────────────────────────
  const confidenceBadgeLevel = d.confidenceLevel === 'low' ? 'needs-review' : d.confidenceLevel

  // ── Resolved states ──────────────────────────────────────────────────────────
  if (state === 'approved') {
    return (
      <ResolvedRow
        icon={<CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
        label={d.title}
        sub="Approved"
        color="border-green-200 bg-green-50/40"
      />
    )
  }
  if (state === 'changes_requested') {
    return (
      <ResolvedRow
        icon={<MessageSquare className="h-4 w-4 text-amber-600 flex-shrink-0" />}
        label={d.title}
        sub={`Changes requested — sent back to ${d.preparedBy}`}
        color="border-amber-200 bg-amber-50/40"
      />
    )
  }
  if (state === 'deferred') {
    return (
      <ResolvedRow
        icon={<MinusCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        label={d.title}
        sub="Deferred — will resurface if it becomes urgent"
        color="border-border bg-muted/20 opacity-50"
      />
    )
  }

  // ── Pending state ────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'rounded-xl border bg-card overflow-hidden',
      escStyle.border,
    )}>

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          {/* Escalation badge */}
          <span className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
            escStyle.badge,
          )}>
            {escStyle.label}
          </span>
          {/* Category badge */}
          <span className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
            catStyle.badge,
          )}>
            {d.category}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground flex-shrink-0">
            <Clock className="h-3 w-3" />
            {d.estimatedTime}
          </span>
        </div>

        {/* Title + toggle */}
        <div className="flex items-start gap-2">
          <p className="text-sm font-semibold text-foreground leading-snug flex-1">
            {d.title}
          </p>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            aria-label={expanded ? 'Collapse' : 'Show full context'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Recommendation — always visible */}
        <div className="mt-2.5 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15">
          <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider mb-1">
            Recommendation
          </p>
          <p className="text-xs text-foreground/90 leading-relaxed font-medium">
            {d.recommendation}
          </p>
        </div>

        {/* Business Impact — always visible */}
        <div className="mt-2.5">
          <ImpactCard
            impact={d.businessImpactSummary}
            actionIf={d.actionIfDelayed}
          />
        </div>

        {/* Confidence — always visible */}
        <div className="mt-2.5">
          <ConfidenceBadge level={confidenceBadgeLevel} note={d.confidenceNote} />
        </div>

        {/* Suggested deadline — always visible if present */}
        {d.suggestedDeadline && (
          <div className="mt-2 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground">
              Recommended by <span className="font-medium text-foreground/70">{d.suggestedDeadline}</span>
            </span>
          </div>
        )}

        {/* Why This Matters — always visible */}
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5">
            Why this matters
          </p>
          <p className="text-xs text-foreground/80 leading-relaxed">{d.whyItMatters}</p>
        </div>
      </div>

      {/* ── Expanded context ── */}
      {expanded && (
        <div className="border-t bg-muted/20 divide-y divide-border/60">

          {/* Business impact (full) */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5">
              Business impact
            </p>
            <p className="text-xs text-foreground/80 leading-relaxed">{d.businessImpact}</p>
          </div>

          {/* Related decisions */}
          {d.relatedDecisions && d.relatedDecisions.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                Related
              </p>
              <ul className="space-y-2">
                {d.relatedDecisions.map(rel => (
                  <li key={rel.id} className="flex items-start gap-2">
                    <Scale className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-foreground/80">{rel.title}</span>
                      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                        {rel.relationship}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Supporting context */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
              Supporting context
            </p>
            <ul className="space-y-1.5">
              {d.context.map((fact, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0 mt-1.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{fact}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Prepared by */}
          <div className="px-4 py-2.5 bg-muted/10">
            <p className="text-[11px] text-muted-foreground/60">
              Prepared by {d.preparedBy} · {d.preparedAt}
            </p>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className={cn(
        'px-4 py-3 flex items-center gap-2',
        expanded ? 'border-t' : '',
      )}>
        <button
          onClick={() => setState('approved')}
          className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </button>
        <button
          onClick={() => setState('changes_requested')}
          className="h-8 px-3.5 rounded-lg text-xs font-medium border border-border bg-background text-foreground hover:bg-accent transition-colors flex items-center gap-1.5"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Ask for changes
        </button>
        <button
          onClick={() => setState('deferred')}
          className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-auto"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
