'use client'
import { OFFICE_SUMMARY } from '@/data/partners'

interface StatProps {
  value: number | string
  label: string
}

function Stat({ value, label }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-lg font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
    </div>
  )
}

export function OfficeSummary() {
  const s = OFFICE_SUMMARY
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <Stat value={s.itemsReviewedToday} label="Items reviewed today" />
      <div className="w-px h-8 bg-border flex-shrink-0" />
      <Stat value={s.commitmentsTracked} label="Commitments tracked" />
      <div className="w-px h-8 bg-border flex-shrink-0" />
      <Stat value={s.memoryEntries} label="Memory entries" />
      <div className="w-px h-8 bg-border flex-shrink-0" />
      <Stat value={s.decisionsReady} label="Decisions ready" />
    </div>
  )
}
