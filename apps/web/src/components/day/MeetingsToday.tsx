'use client'

import { useState } from 'react'
import { MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_MEETINGS, type Meeting } from '@/data/mockMeetings'

function BriefChip({ hasBrief }: { hasBrief: boolean }) {
  if (hasBrief) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
        Brief ready
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
      Being prepared
    </span>
  )
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-primary tabular-nums">{meeting.time}</span>
              <span className="text-[11px] text-muted-foreground">{meeting.duration}</span>
            </div>
            <p className="text-sm font-medium text-foreground leading-snug">{meeting.title}</p>
            <div className="flex items-center flex-wrap gap-3 mt-2">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {meeting.location}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3 flex-shrink-0" />
                {meeting.attendees.length} {meeting.attendees.length === 1 ? 'attendee' : 'attendees'}
              </span>
              <BriefChip hasBrief={meeting.hasBrief} />
            </div>
          </div>
          <span className="flex-shrink-0 text-muted-foreground mt-1">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3.5 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{meeting.context}</p>
          <div className="flex flex-wrap gap-1.5">
            {meeting.attendees.map(a => (
              <span
                key={a}
                className="text-[11px] bg-background border border-border px-2 py-0.5 rounded-md text-muted-foreground"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MeetingsToday() {
  return (
    <div className="space-y-2.5">
      {MOCK_MEETINGS.map(m => (
        <MeetingRow key={m.id} meeting={m} />
      ))}
    </div>
  )
}
