'use client'
import { PARTNERS, APPROVAL_ITEMS, ATTENTION_ITEMS } from '@/data/partners'
import { ExecutiveOfficeHeader } from '@/components/partners/ExecutiveOfficeHeader'
import { PartnerCard } from '@/components/partners/PartnerCard'
import { PartnerActivityFeed } from '@/components/partners/PartnerActivityFeed'
import { ApprovalCard } from '@/components/partners/ApprovalCard'
import { AttentionItem } from '@/components/partners/AttentionItem'
import { CheckCircle2 } from 'lucide-react'

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

export default function PartnersPage() {
  const waitingPartners  = PARTNERS.filter(p => p.workState === 'waiting').length
  const attentionCount   = ATTENTION_ITEMS.length
  const approvalCount    = APPROVAL_ITEMS.length

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
          {APPROVAL_ITEMS.map(item => (
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
          {PARTNERS.map(partner => (
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
