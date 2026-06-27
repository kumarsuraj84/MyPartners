'use client'
import { DECISIONS, countByCategory, countByEscalation } from '@/data/decisions'
import { DecisionInbox } from '@/components/decisions/DecisionInbox'
import type { DecisionCategory } from '@/data/decisions'

const CATEGORY_STYLES: Record<DecisionCategory, string> = {
  Strategic:   'bg-blue-50 text-blue-700 border-blue-200',
  Financial:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  Operational: 'bg-violet-50 text-violet-700 border-violet-200',
  People:      'bg-rose-50 text-rose-700 border-rose-200',
  External:    'bg-amber-50 text-amber-700 border-amber-200',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

export default function DecisionsPage() {
  const categoryCounts   = countByCategory(DECISIONS)
  const escalationCounts = countByEscalation(DECISIONS)
  const totalPending     = DECISIONS.length

  const escalationParts: string[] = []
  if (escalationCounts.critical  > 0) escalationParts.push(`${escalationCounts.critical} critical`)
  if (escalationCounts.urgent    > 0) escalationParts.push(`${escalationCounts.urgent} urgent`)
  if (escalationCounts.important > 0) escalationParts.push(`${escalationCounts.important} important`)

  return (
    <div className="animate-fade-in max-w-2xl space-y-8 pb-16">

      {/* Page header */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
          Prepared by your office — ready for your decision
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Decision Inbox</h1>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <p className="text-muted-foreground text-sm">
            {totalPending} decision{totalPending !== 1 ? 's' : ''} awaiting your approval
          </p>
          {escalationParts.length > 0 && (
            <>
              <span className="text-muted-foreground/30 text-sm">·</span>
              <p className="text-xs text-muted-foreground/70">
                {escalationParts.join(' · ')}
              </p>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xl">
          Each item has been researched and prepared by your office. The recommendation,
          context, and business impact are ready — you provide the judgement.
        </p>
      </div>

      {/* Category counts */}
      <div>
        <SectionLabel>By area</SectionLabel>
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.entries(categoryCounts) as [DecisionCategory, number][]).map(([category, count]) => (
            <div
              key={category}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${CATEGORY_STYLES[category]}`}
            >
              {category}
              <span className="text-[11px] font-bold tabular-nums opacity-70">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inbox */}
      <div>
        <SectionLabel>Pending decisions</SectionLabel>
        <DecisionInbox decisions={DECISIONS} />
      </div>

    </div>
  )
}
