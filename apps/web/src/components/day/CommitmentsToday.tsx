'use client'

import { Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_COMMITMENTS, type Commitment } from '@/data/mockCommitments'

function CommitmentRow({ c }: { c: Commitment }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3.5',
        c.isOverdue
          ? 'border-red-200 bg-red-50/30'
          : 'border-border bg-card',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{c.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {c.category === 'owed-to-you' && (
              <span className="text-[11px] text-muted-foreground">
                from <span className="font-medium text-foreground/70">{c.owner}</span>
              </span>
            )}
            <span
              className={cn(
                'flex items-center gap-1 text-[11px] font-medium',
                c.isOverdue ? 'text-red-600' : 'text-muted-foreground',
              )}
            >
              <Clock className="h-3 w-3 flex-shrink-0" />
              {c.isOverdue
                ? `${Math.abs(c.daysUntilDue)} ${Math.abs(c.daysUntilDue) === 1 ? 'day' : 'days'} overdue`
                : c.dueDate}
            </span>
            {c.isOverdue && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                Overdue
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CommitmentGroup({
  label,
  items,
  maxVisible,
  totalCount,
}: {
  label: string
  items: Commitment[]
  maxVisible: number
  totalCount: number
}) {
  if (items.length === 0) return null
  const visible = items.slice(0, maxVisible)
  const hidden = items.length - visible.length

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
        {label}
      </p>
      {visible.map(c => (
        <CommitmentRow key={c.id} c={c} />
      ))}
      {hidden > 0 && (
        <p className="text-[11px] text-muted-foreground pl-1">+{hidden} more</p>
      )}
    </div>
  )
}

export function CommitmentsToday() {
  const all = MOCK_COMMITMENTS
  const youOwe = all.filter(c => c.category === 'you-owe')
  const owedToYou = all.filter(c => c.category === 'owed-to-you')

  // Distribute the visible cap of 4 proportionally, prioritising "you owe"
  const MAX = 4
  const youOweMax = Math.min(youOwe.length, Math.ceil(MAX / 2))
  const owedMax = Math.min(owedToYou.length, MAX - youOweMax)

  return (
    <div className="space-y-4">
      <CommitmentGroup label="You owe" items={youOwe} maxVisible={youOweMax} totalCount={youOwe.length} />
      <CommitmentGroup label="Owed to you" items={owedToYou} maxVisible={owedMax} totalCount={owedToYou.length} />
    </div>
  )
}
