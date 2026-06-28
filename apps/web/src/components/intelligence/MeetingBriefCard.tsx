'use client'

import { useState } from 'react'
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export interface MeetingBriefAttendee {
  name: string
  email?: string
  role?: string | null
  company?: string | null
  hasContext: boolean
}

export interface RecentMessage {
  id: string
  fromName?: string | null
  subject?: string | null
  summary?: string | null
  receivedAt: string
}

export interface MeetingBrief {
  id: string
  title: string
  startTime: string
  endTime?: string | null
  location?: string | null
  attendees: MeetingBriefAttendee[]
  recentMessages: RecentMessage[]
  context?: string | null
  preparedBy: string
  preparedAt: string
}

interface Props {
  brief: MeetingBrief
  defaultExpanded?: boolean
}

function formatTimeRange(startTime: string, endTime?: string | null): string {
  const start = format(parseISO(startTime), 'h:mm a')
  if (!endTime) return start
  const end = format(parseISO(endTime), 'h:mm a')
  return `${start} – ${end}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function AttendeeChip({ attendee }: { attendee: MeetingBriefAttendee }) {
  return (
    <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-1.5">
      <div className="relative flex-shrink-0">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {getInitials(attendee.name)}
        </span>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${
            attendee.hasContext ? 'bg-green-500' : 'bg-muted-foreground/40'
          }`}
        />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground leading-none truncate">{attendee.name}</p>
        {(attendee.role || attendee.company) && (
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">
            {[attendee.role, attendee.company].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  )
}

function MessageRow({ message }: { message: RecentMessage }) {
  const relativeTime = formatDistanceToNow(parseISO(message.receivedAt), { addSuffix: true })
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-foreground">{message.fromName ?? 'Unknown'}</span>
        {message.subject && (
          <span className="text-xs text-muted-foreground"> · {message.subject}</span>
        )}
      </div>
      <span className="flex-shrink-0 text-[11px] text-muted-foreground">{relativeTime}</span>
    </div>
  )
}

export function MeetingBriefCard({ brief, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-primary tabular-nums">
                {formatTimeRange(brief.startTime, brief.endTime)}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">{brief.title}</p>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              {brief.location && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {brief.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                Brief ready
              </span>
            </div>
          </div>
          <span className="flex-shrink-0 text-muted-foreground mt-1">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3.5 space-y-4">
          {brief.attendees.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Who&apos;s in the room
              </p>
              <div className="flex flex-wrap gap-2">
                {brief.attendees.map(attendee => (
                  <AttendeeChip key={attendee.email ?? attendee.name} attendee={attendee} />
                ))}
              </div>
            </div>
          )}

          {brief.recentMessages.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Recent from them
              </p>
              <div className="divide-y divide-border/50">
                {brief.recentMessages.map(message => (
                  <MessageRow key={message.id} message={message} />
                ))}
              </div>
            </div>
          )}

          {brief.context && (
            <p className="text-xs text-muted-foreground leading-relaxed">{brief.context}</p>
          )}

          <p className="text-[11px] text-muted-foreground">
            Prepared by {brief.preparedBy}
          </p>
        </div>
      )}
    </div>
  )
}
