'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Crown, Mail, RefreshCw, Calendar, Brain, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WhyThisMatters } from './WhyThisMatters'
import type { Partner, PartnerStatus, WorkState } from '@/data/partners'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PartnerStatus, { pill: string; dot: string }> = {
  'Reviewing':            { pill: 'bg-blue-50 text-blue-600 border-blue-100',      dot: 'bg-blue-500 animate-pulse-soft' },
  'Preparing':            { pill: 'bg-amber-50 text-amber-600 border-amber-100',   dot: 'bg-amber-500 animate-pulse-soft' },
  'Organizing':           { pill: 'bg-violet-50 text-violet-600 border-violet-100',dot: 'bg-violet-500 animate-pulse-soft' },
  'Following Up':         { pill: 'bg-orange-50 text-orange-600 border-orange-100',dot: 'bg-orange-500 animate-pulse-soft' },
  'Waiting for Approval': { pill: 'bg-zinc-50 text-zinc-500 border-zinc-200',      dot: 'bg-zinc-400' },
  'Ready':                { pill: 'bg-green-50 text-green-600 border-green-100',   dot: 'bg-green-500' },
}

// ─── Work state config ────────────────────────────────────────────────────────

const WORK_STATE_CONFIG: Record<WorkState, { label: string; bar: string }> = {
  working:   { label: 'Working',            bar: 'bg-primary' },
  waiting:   { label: 'Waiting for review', bar: 'bg-amber-400' },
  completed: { label: 'Done for now',       bar: 'bg-green-500' },
}

// ─── Partner icons ────────────────────────────────────────────────────────────

const PARTNER_ICONS: Record<string, React.ElementType> = {
  'chief-of-staff': Crown,
  'communication':  Mail,
  'followup':       RefreshCw,
  'meeting':        Calendar,
  'memory':         Brain,
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PartnerCardProps {
  partner: Partner
}

export function PartnerCard({ partner }: PartnerCardProps) {
  const [expanded, setExpanded] = useState(false)

  const statusStyle = STATUS_STYLES[partner.status]
  const workConfig  = WORK_STATE_CONFIG[partner.workState]
  const Icon        = PARTNER_ICONS[partner.id] ?? Crown

  const isCompleted = partner.workState === 'completed'
  const isWaiting   = partner.workState === 'waiting'

  return (
    <div className={cn(
      'rounded-xl border bg-card overflow-hidden transition-colors',
      isWaiting && 'border-l-2 border-l-amber-400',
      isCompleted && 'opacity-75',
    )}>
      {/* Header */}
      <div className="px-4 py-3.5 flex items-start gap-3">
        {/* Avatar */}
        <div className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
          partner.color,
          isCompleted && 'opacity-60',
        )}>
          {isCompleted
            ? <CheckCircle2 className="h-4 w-4 text-white" />
            : <Icon className={cn('h-4 w-4', partner.iconColor)} />
          }
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-none">{partner.name}</p>
            <span className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
              statusStyle.pill,
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', statusStyle.dot)} />
              {partner.status}
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

      {/* Focus line */}
      <div className="px-4 pb-3 -mt-1">
        <p className="text-xs text-muted-foreground leading-relaxed pl-11">
          {partner.focus}
        </p>
      </div>

      {/* Work state indicator */}
      <div className="px-4 pb-3.5 pl-[60px]">
        <div className="flex items-center gap-2">
          <div className={cn('h-1 w-16 rounded-full bg-muted overflow-hidden')}>
            <div className={cn(
              'h-full rounded-full',
              workConfig.bar,
              partner.workState === 'working' ? 'w-2/3' : 'w-full',
            )} />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {workConfig.label}
          </span>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t bg-muted/20">
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

          {/* Why this matters */}
          <WhyThisMatters text={partner.whyItMatters} />
        </div>
      )}
    </div>
  )
}
