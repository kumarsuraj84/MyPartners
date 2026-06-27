'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type RecommendationCardProps = {
  recommendation: string
  preparedBy: string
  context?: string
}

export function RecommendationCard({ recommendation, preparedBy, context }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg bg-primary/5 border border-primary/15 px-3.5 py-3 space-y-2">
      <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider">
        Recommendation
      </p>
      <p className="text-sm font-medium text-foreground leading-snug">
        {recommendation}
      </p>
      <p className="text-[11px] text-muted-foreground">
        Prepared by {preparedBy}
      </p>
      {context && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
            />
            {expanded ? 'Hide context' : 'Show context'}
          </button>
          {expanded && (
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed border-t border-primary/10 pt-2">
              {context}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
