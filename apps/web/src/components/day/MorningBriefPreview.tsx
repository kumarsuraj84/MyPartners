'use client'

import { MOCK_BRIEF } from '@/data/mockBrief'

interface BriefProps {
  brief?: {
    situationSummary: string[]
    topPriority: string
  }
}

export function MorningBriefPreview({ brief }: BriefProps) {
  const data = brief ?? {
    situationSummary: MOCK_BRIEF.situationSummary,
    topPriority: MOCK_BRIEF.topPriority,
  }

  return (
    <div className="space-y-4">
      {data.situationSummary.length > 0 && (
        <div className="space-y-2">
          {data.situationSummary.map((line, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      )}
      {data.topPriority && (
        <div className="px-4 py-3.5 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-[11px] font-semibold text-primary/80 uppercase tracking-wider mb-1">
            Focus
          </p>
          <p className="text-sm font-medium text-foreground leading-snug">
            {data.topPriority}
          </p>
        </div>
      )}
    </div>
  )
}
