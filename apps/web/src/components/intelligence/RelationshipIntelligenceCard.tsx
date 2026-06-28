'use client'

import { cn } from '@/lib/utils'

export interface RelationshipIntelligence {
  id: string
  name: string
  email: string | null
  role: string | null
  company: string | null
  messageCount30d: number
  messageCountTotal: number
  urgentCount: number
  recentTopics: string[]
  daysLastContact: number | null
  trend: 'new' | 'active' | 'declining' | 'dormant'
  openTasks: number
  healthScore: number
}

export interface RelationshipIntelligenceCardProps {
  person: RelationshipIntelligence
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('')
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

const trendConfig = {
  active: {
    avatar: 'bg-emerald-100 text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-700',
    label: 'Active',
  },
  new: {
    avatar: 'bg-blue-100 text-blue-700',
    chip: 'bg-blue-100 text-blue-700',
    label: 'New contact',
  },
  declining: {
    avatar: 'bg-amber-100 text-amber-700',
    chip: 'bg-amber-100 text-amber-700',
    label: 'Needs attention',
  },
  dormant: {
    avatar: 'bg-muted text-muted-foreground',
    chip: 'bg-muted text-muted-foreground',
    label: 'Dormant',
  },
}

export function RelationshipIntelligenceCard({ person }: RelationshipIntelligenceCardProps) {
  const initials = getInitials(person.name)
  const config = trendConfig[person.trend]
  const subtitle = [person.role, person.company].filter(Boolean).join(' @ ')
  const visibleTopics = person.recentTopics.slice(0, 2)

  return (
    <div className="rounded-xl border bg-card px-4 py-3.5 flex items-start gap-3">
      {/* Avatar */}
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          config.avatar,
        )}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Right column */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Name + trend chip */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">
            {person.name}
          </p>
          <span
            className={cn(
              'inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
              config.chip,
            )}
          >
            {config.label}
          </span>
        </div>

        {/* Role @ company */}
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">
            {subtitle}
          </p>
        )}

        {/* Message count + last contact */}
        <p className="text-[11px] text-muted-foreground">
          {person.messageCount30d} {person.messageCount30d === 1 ? 'message' : 'messages'} (30d)
          {person.daysLastContact !== null && (
            <>
              {' · '}
              last contact{' '}
              {person.daysLastContact === 0
                ? 'today'
                : person.daysLastContact === 1
                  ? '1 day ago'
                  : `${person.daysLastContact} days ago`}
            </>
          )}
        </p>

        {/* Recent topics */}
        {visibleTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleTopics.map((topic, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                title={topic}
              >
                {truncate(topic, 24)}
              </span>
            ))}
          </div>
        )}

        {/* Open tasks badge */}
        {person.openTasks > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            {person.openTasks} open {person.openTasks === 1 ? 'task' : 'tasks'}
          </span>
        )}
      </div>
    </div>
  )
}
