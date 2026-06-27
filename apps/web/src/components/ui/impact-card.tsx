'use client'

import { cn } from '@/lib/utils'

type ImpactCardProps = {
  impact: string
  actionIf?: string
}

export function ImpactCard({ impact, actionIf }: ImpactCardProps) {
  return (
    <div className="rounded-lg border-l-2 border-l-orange-400 bg-orange-50/30 px-3 py-2.5 space-y-1">
      <p className="text-xs font-medium text-foreground/80 leading-relaxed">
        {impact}
      </p>
      {actionIf && (
        <p className="text-[11px] text-orange-600/80 leading-relaxed">
          If not acted on: {actionIf}
        </p>
      )}
    </div>
  )
}
