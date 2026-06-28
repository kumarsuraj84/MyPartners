import { Scale, CheckSquare, Bell, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PreferenceInsight {
  id: string
  insight: string
  detail: string
  category: string
}

export interface PreferenceInsightCardProps {
  insight: PreferenceInsight
}

export interface StatChipProps {
  label: string
  value: string | number
  accent?: boolean
}

export function StatChip({ label, value, accent }: StatChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        accent
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground'
      )}
    >
      <span className="font-semibold">{value}</span>
      <span>{label}</span>
    </span>
  )
}

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  decisions: Scale,
  commitments: CheckSquare,
  attention: Bell,
  general: Lightbulb,
}

export function PreferenceInsightCard({ insight }: PreferenceInsightCardProps) {
  const Icon = CATEGORY_ICON[insight.category] ?? Lightbulb

  return (
    <div className="rounded-xl border bg-card px-4 py-3.5">
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground">
            {insight.insight}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {insight.detail}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/50 mt-2.5">
        Learned from your behaviour
      </p>
    </div>
  )
}
