'use client'

import type { ReactNode } from 'react'
import { Mail, Calendar, CheckSquare, Clock, AlertCircle } from 'lucide-react'

export interface MorningBriefCardProps {
  brief?: {
    greeting?: string
    situationSummary: string[]
    topPriority: string
    commitmentsSummary?: string
    followUpsSummary?: string
    waitingForSummary?: string
    _meta?: {
      unreadMessages: number
      urgentCount: number
      commitmentsCount: number
      followUpsCount: number
      waitingForCount: number
      overdueCount: number
      meetingsToday?: number
    }
  }
  isLoading?: boolean
}

export function MorningBriefCard({ brief, isLoading }: MorningBriefCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card overflow-hidden animate-pulse">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-muted flex-shrink-0" />
          ))}
        </div>
        <div className="h-px bg-border" />
        <div className="px-4 py-4 space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-4 bg-muted rounded w-4/6" />
          <div className="h-10 bg-muted rounded-r-lg mt-3" />
        </div>
      </div>
    )
  }

  if (!brief) return null

  const meta = brief._meta

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* ── Stat chips ────────────────────────────────────────────────────── */}
      {meta && (
        <>
          <div className="flex gap-2 px-4 py-3 overflow-x-auto">
            <StatChip
              icon={<Mail className="h-3.5 w-3.5" />}
              label={`${meta.unreadMessages} unread`}
              highlight={meta.urgentCount > 0 ? 'amber' : undefined}
            />
            <StatChip
              icon={<Calendar className="h-3.5 w-3.5" />}
              label={`${meta.meetingsToday ?? 0} meetings`}
            />
            <StatChip
              icon={<CheckSquare className="h-3.5 w-3.5" />}
              label={`${meta.commitmentsCount} commitments`}
            />
            <StatChip
              icon={<Clock className="h-3.5 w-3.5" />}
              label={`${meta.waitingForCount} waiting`}
            />
            <StatChip
              icon={<AlertCircle className="h-3.5 w-3.5" />}
              label={`${meta.overdueCount} overdue`}
              highlight={meta.overdueCount > 0 ? 'red' : undefined}
            />
          </div>
          <div className="h-px bg-border" />
        </>
      )}

      {/* ── Situation summary + focus ─────────────────────────────────────── */}
      <div className="px-4 py-4 space-y-3">
        {brief.situationSummary.length > 0 && (
          <div className="space-y-1.5">
            {brief.situationSummary.slice(0, 3).map((line, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                • {line}
              </p>
            ))}
          </div>
        )}

        {brief.topPriority && (
          <div className="bg-primary/5 border-l-2 border-primary px-3 py-2.5 rounded-r-lg">
            <p className="text-sm font-medium text-primary">→ {brief.topPriority}</p>
          </div>
        )}

        {(brief.commitmentsSummary || brief.followUpsSummary || brief.waitingForSummary) && (
          <div className="space-y-1 pt-1">
            {brief.commitmentsSummary && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {brief.commitmentsSummary}
              </p>
            )}
            {brief.followUpsSummary && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {brief.followUpsSummary}
              </p>
            )}
            {brief.waitingForSummary && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {brief.waitingForSummary}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({
  icon,
  label,
  highlight,
}: {
  icon: ReactNode
  label: string
  highlight?: 'amber' | 'red'
}) {
  const colorClass =
    highlight === 'red'
      ? 'text-red-600 bg-red-50 border-red-200'
      : highlight === 'amber'
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-muted-foreground bg-muted/50 border-border'

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${colorClass}`}
    >
      {icon}
      {label}
    </div>
  )
}
