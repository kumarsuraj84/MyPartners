'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Crown, Mail, RefreshCw, Calendar, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Partner, PartnerStatus } from '@/data/partners'

const STATUS_STYLES: Record<PartnerStatus, { pill: string; dot: string; label: string }> = {
  'Reviewing':             { pill: 'bg-blue-50 text-blue-600 border-blue-100',   dot: 'bg-blue-500',   label: 'Reviewing' },
  'Preparing':             { pill: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500',  label: 'Preparing' },
  'Organizing':            { pill: 'bg-violet-50 text-violet-600 border-violet-100', dot: 'bg-violet-500', label: 'Organizing' },
  'Following Up':          { pill: 'bg-orange-50 text-orange-600 border-orange-100', dot: 'bg-orange-500', label: 'Following Up' },
  'Waiting for Approval':  { pill: 'bg-zinc-50 text-zinc-500 border-zinc-200',   dot: 'bg-zinc-400',   label: 'Waiting for Approval' },
  'Ready':                 { pill: 'bg-green-50 text-green-600 border-green-100', dot: 'bg-green-500',  label: 'Ready' },
}

const PARTNER_ICONS: Record<string, React.ElementType> = {
  'chief-of-staff': Crown,
  'communication':  Mail,
  'followup':       RefreshCw,
  'meeting':        Calendar,
  'memory':         Brain,
}

interface PartnerCardProps {
  partner: Partner
}

export function PartnerCard({ partner }: PartnerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const style = STATUS_STYLES[partner.status]
  const Icon = PARTNER_ICONS[partner.id] ?? Crown

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header row */}
      <div className="px-4 py-3.5 flex items-start gap-3">
        {/* Avatar */}
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', partner.color)}>
          <Icon className={cn('h-4 w-4', partner.iconColor)} />
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-none">{partner.name}</p>
            <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border', style.pill)}>
              <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', style.dot)} />
              {style.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{partner.role}</p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />
          }
        </button>
      </div>

      {/* Focus line — always visible */}
      <div className="px-4 pb-3.5 -mt-1">
        <p className="text-xs text-muted-foreground leading-relaxed pl-11">
          {partner.focus}
        </p>
      </div>

      {/* Expanded: stats + activity */}
      {expanded && (
        <div className="border-t bg-muted/30">
          {/* Stats */}
          <div className="px-4 py-3 flex gap-5 flex-wrap border-b">
            {partner.stats.map(stat => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <span className="text-base font-semibold text-foreground tabular-nums">{stat.value}</span>
                <span className="text-[11px] text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div className="px-4 py-3 space-y-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Recent activity
            </p>
            {partner.activities.map(activity => (
              <div key={activity.id} className="flex items-start gap-2.5">
                <span className="text-[11px] text-muted-foreground/60 tabular-nums whitespace-nowrap mt-0.5 w-20 flex-shrink-0">
                  {activity.time}
                </span>
                <p className="text-xs text-foreground/80 leading-relaxed">{activity.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
