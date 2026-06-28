'use client'

import { TrendingUp, AlertTriangle, BarChart2 } from 'lucide-react'

export interface ExecutivePattern {
  id: string
  pattern: string
  detail: string
  value: string
  trend: 'positive' | 'neutral' | 'attention'
}

interface Props {
  pattern: ExecutivePattern
}

function TrendIcon({ trend }: { trend: ExecutivePattern['trend'] }) {
  if (trend === 'positive') {
    return <TrendingUp className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
  }
  if (trend === 'attention') {
    return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
  }
  return <BarChart2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
}

export function ExecutivePatternCard({ pattern }: Props) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3.5 flex items-start gap-3">
      <TrendIcon trend={pattern.trend} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground leading-snug">{pattern.pattern}</p>
          <span className="text-xl font-bold tabular-nums text-foreground flex-shrink-0">
            {pattern.value}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{pattern.detail}</p>
      </div>
    </div>
  )
}
