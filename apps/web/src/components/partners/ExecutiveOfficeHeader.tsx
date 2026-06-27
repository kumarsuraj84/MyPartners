'use client'
import { PARTNERS, OFFICE_SUMMARY } from '@/data/partners'
import { OfficeSummary } from './OfficeSummary'
import { format } from 'date-fns'

export function ExecutiveOfficeHeader() {
  const activeCount = PARTNERS.filter(p => p.status !== 'Ready' && p.status !== 'Waiting for Approval').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your Executive Office</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {format(new Date(), 'EEEE, MMMM d')} &nbsp;·&nbsp;{' '}
          <span className="text-foreground/80">
            {activeCount} of {PARTNERS.length} partners active
          </span>
        </p>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xl">
          Your office is running. Partners are reviewing messages, tracking commitments, and building
          your business memory — so only what needs you reaches your desk.
        </p>
      </div>

      <div className="px-4 py-3.5 rounded-xl border bg-card">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">
          Office activity today
        </p>
        <OfficeSummary />
        <p className="text-[11px] text-muted-foreground mt-3">
          Updated {OFFICE_SUMMARY.lastUpdated}
        </p>
      </div>
    </div>
  )
}
