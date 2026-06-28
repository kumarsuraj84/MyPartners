'use client'

import { cn } from '@/lib/utils'

export interface PersonContext {
  id: string
  name: string
  role: string | null
  company: string | null
  email: string | null
  description: string | null
  recentTopics: string[]
  lastContact: string | null
  messageCount: number
}

interface Props {
  person: PersonContext
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('')
}

function relativeTime(isoDate: string): string {
  const now = new Date()
  const then = new Date(isoDate)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths === 1) return '1 month ago'
  if (diffMonths < 12) return `${diffMonths} months ago`
  const diffYears = Math.floor(diffMonths / 12)
  return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

export function RelationshipContextCard({ person }: Props) {
  const initials = getInitials(person.name)
  const subtitle = [person.role, person.company].filter(Boolean).join(' · ')
  const visibleTopics = person.recentTopics.slice(0, 3)

  return (
    <div className="rounded-xl border bg-card px-4 py-3.5 space-y-3">
      {/* Top row: avatar + name/role + message count */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold"
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">
              {person.name}
            </p>
            <span className="inline-flex flex-shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {person.messageCount} {person.messageCount === 1 ? 'message' : 'messages'}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Last contact */}
      {person.lastContact && (
        <p className="text-[11px] text-muted-foreground">
          Last contact:{' '}
          <span className="font-medium text-foreground/70">
            {relativeTime(person.lastContact)}
          </span>
        </p>
      )}

      {/* Recent topics */}
      {visibleTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleTopics.map((topic, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
              title={topic}
            >
              {truncate(topic, 32)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
