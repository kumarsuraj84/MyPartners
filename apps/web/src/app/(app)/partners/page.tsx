'use client'
import { PARTNERS, APPROVAL_ITEMS, ATTENTION_ITEMS } from '@/data/partners'
import { ExecutiveOfficeHeader } from '@/components/partners/ExecutiveOfficeHeader'
import { PartnerCard } from '@/components/partners/PartnerCard'
import { PartnerActivityFeed } from '@/components/partners/PartnerActivityFeed'
import { ApprovalCard } from '@/components/partners/ApprovalCard'
import { AttentionItem } from '@/components/partners/AttentionItem'
import { CheckCircle2 } from 'lucide-react'
import { useApprovalItems, useTaskStats } from '@/hooks/use-partners-data'
import type { Partner } from '@/data/partners'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

function SectionLabelWithCount({ children, count, accent }: {
  children: React.ReactNode
  count?: number
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
        {children}
      </p>
      {count !== undefined && count > 0 && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
          accent
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
    </div>
  )
}

/**
 * Merge live task stats into the Follow-up Partner card so counts are real.
 * All other partners keep their static mock data — EOS language is preserved.
 */
function applyTaskStats(
  partners: Partner[],
  stats: { overdue: number; commitments: number; waiting_for: number } | undefined
): Partner[] {
  if (!stats) return partners
  return partners.map(p => {
    if (p.id !== 'followup') return p
    const overdue = stats.overdue
    const commitments = stats.commitments
    const waitingFor = stats.waiting_for
    return {
      ...p,
      stats: [
        { label: 'Commitments open', value: String(commitments) },
        { label: 'Overdue', value: String(overdue) },
        { label: 'Waiting on others', value: String(waitingFor) },
      ],
      needsAttention:
        overdue > 0
          ? `${overdue} commitment${overdue > 1 ? 's are' : ' is'} overdue`
          : undefined,
      workState: overdue > 0 ? 'working' : commitments > 0 ? 'working' : 'completed',
    }
  })
}

export default function PartnersPage() {
  const { data: liveApprovals, isError: approvalsError } = useApprovalItems()
  const { data: taskStats } = useTaskStats()

  // Use live approvals when available and non-empty; fall back to mock data
  const approvalItems =
    !approvalsError && liveApprovals && liveApprovals.length > 0
      ? liveApprovals
      : APPROVAL_ITEMS

  const partners = applyTaskStats(PARTNERS, taskStats)

  const waitingPartners  = partners.filter(p => p.workState === 'waiting').length
  const attentionCount   = ATTENTION_ITEMS.length
  const approvalCount    = approvalItems.length

  return (
    <div className="animate-fade-in max-w-2xl space-y-10 pb-16">

      {/* Office Header + Summary */}
      <ExecutiveOfficeHeader />

      {/* YOUR REVIEW ─────────────────────────────────────────── */}
      <section>
        <SectionLabelWithCount count={approvalCount} accent>
          Your review
        </SectionLabelWithCount>
        <div className="space-y-2">
          {approvalItems.map(item => (
            <ApprovalCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* NEEDS YOUR ATTENTION ────────────────────────────────── */}
      <section>
        <SectionLabelWithCount count={attentionCount}>
          Needs your attention
        </SectionLabelWithCount>
        <div className="space-y-2">
          {ATTENTION_ITEMS.map(item => (
            <AttentionItem key={item.id} item={item} />
          ))}
        </div>
        {attentionCount === 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-card">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Nothing needs your attention right now.</p>
          </div>
        )}
      </section>

      {/* YOUR PARTNERS ───────────────────────────────────────── */}
      <section>
        <SectionLabelWithCount count={waitingPartners}>
          Your partners
        </SectionLabelWithCount>
        <div className="space-y-2">
          {partners.map(partner => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      </section>

      {/* RECENT ACTIVITY ─────────────────────────────────────── */}
      <section>
        <SectionLabel>Recent office activity</SectionLabel>
        <PartnerActivityFeed />
      </section>

    </div>
  )
}
