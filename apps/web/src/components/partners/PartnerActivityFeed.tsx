'use client'
import { ALL_ACTIVITIES, PARTNERS } from '@/data/partners'
import { cn } from '@/lib/utils'

const PARTNER_COLORS: Record<string, string> = {
  'chief-of-staff': 'bg-primary/10 text-primary',
  'communication':  'bg-violet-100 text-violet-600',
  'followup':       'bg-orange-100 text-orange-600',
  'meeting':        'bg-emerald-100 text-emerald-600',
  'memory':         'bg-rose-100 text-rose-600',
}

export function PartnerActivityFeed() {
  const activities = ALL_ACTIVITIES.slice(0, 8)

  return (
    <div className="space-y-1">
      {activities.map(activity => (
        <div
          key={activity.id}
          className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-card"
        >
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 whitespace-nowrap',
            PARTNER_COLORS[activity.partnerId] ?? 'bg-muted text-muted-foreground'
          )}>
            {activity.partnerName.replace(' Partner', '')}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground/80 leading-relaxed">{activity.description}</p>
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0 tabular-nums mt-0.5">
            {activity.time}
          </span>
        </div>
      ))}
    </div>
  )
}
