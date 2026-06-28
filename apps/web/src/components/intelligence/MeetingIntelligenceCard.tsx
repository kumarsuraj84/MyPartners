'use client'

import { MapPin } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export interface MeetingIntelligenceAttendee {
  name: string
  role?: string | null
  company?: string | null
  hasContext: boolean
}

export interface MeetingIntelligence {
  id: string
  title: string
  startTime: string
  attendees: MeetingIntelligenceAttendee[]
  tasksCreated: number
  location?: string | null
  preparedBy: string
}

interface Props {
  meeting: MeetingIntelligence
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function MeetingIntelligenceCard({ meeting }: Props) {
  const visibleAttendees = meeting.attendees.slice(0, 3)
  const extraCount = meeting.attendees.length - visibleAttendees.length

  return (
    <div className="rounded-xl border bg-card px-4 py-3.5">
      {/* Row: time + title */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-primary tabular-nums flex-shrink-0">
          {format(parseISO(meeting.startTime), 'h:mm a')}
        </span>
        <p className="text-sm font-medium text-foreground leading-snug truncate">{meeting.title}</p>
      </div>

      {/* Subrow: attendee count · location · follow-ups chip */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
        <span className="text-[11px] text-muted-foreground">
          {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
        </span>

        {meeting.location && (
          <>
            <span className="text-muted-foreground/40 text-[10px]">·</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {meeting.location}
            </span>
          </>
        )}

        {meeting.tasksCreated > 0 && (
          <>
            <span className="text-muted-foreground/40 text-[10px]">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
              {meeting.tasksCreated} follow-up{meeting.tasksCreated !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      {/* Attendee initials row */}
      {meeting.attendees.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2.5">
          {visibleAttendees.map((attendee, i) => (
            <div key={i} className="relative flex-shrink-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {getInitials(attendee.name)}
              </span>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${
                  attendee.hasContext ? 'bg-green-500' : 'bg-muted-foreground/40'
                }`}
              />
            </div>
          ))}
          {extraCount > 0 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              +{extraCount}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground mt-2.5">
        Prepared by {meeting.preparedBy}
      </p>
    </div>
  )
}
