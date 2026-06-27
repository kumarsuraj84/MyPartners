// ─── Office Activity ──────────────────────────────────────────────────────────

export type OfficeEventType = 'prepared' | 'reviewed' | 'flagged' | 'updated' | 'completed'
export type MemoryEntityType = 'person' | 'org' | 'project' | 'decision'

export interface OfficeEvent {
  id: string
  time: string
  partnerName: string
  action: string
  details: string
  type: OfficeEventType
}

export interface MemoryUpdate {
  id: string
  entityType: MemoryEntityType
  entityName: string
  change: string
  time: string
}

// ─── Mock: Office Events ──────────────────────────────────────────────────────

export const MOCK_OFFICE_EVENTS: OfficeEvent[] = [
  {
    id: 'oe-1',
    time: '4 min ago',
    partnerName: 'Chief of Staff',
    action: 'Reviewed morning brief',
    details: 'Reviewed 14 overnight items and surfaced 3 decisions for your attention. Coordinated with Communication Partner on the Apex Ventures thread.',
    type: 'reviewed',
  },
  {
    id: 'oe-2',
    time: '12 min ago',
    partnerName: 'Communication Partner',
    action: 'Prepared draft reply',
    details: 'Prepared a draft response to Marcus Webb (Apex Ventures) regarding the Series B term sheet. Ready for your approval.',
    type: 'prepared',
  },
  {
    id: 'oe-3',
    time: '20 min ago',
    partnerName: 'Memory Partner',
    action: 'Updated business memory',
    details: 'Added Marcus Webb\'s message and the updated term sheet details to the Series B project record. Linked to Apex Ventures organisation.',
    type: 'updated',
  },
  {
    id: 'oe-4',
    time: '30 min ago',
    partnerName: 'Meeting Partner',
    action: 'Prepared meeting brief',
    details: 'Completed the Board Prep briefing for today\'s 2:00 PM session. Included Q3 variance context, Series B talking points, and Anjali Mehra\'s attendance note.',
    type: 'prepared',
  },
  {
    id: 'oe-5',
    time: '45 min ago',
    partnerName: 'Follow-up Partner',
    action: 'Flagged overdue commitment',
    details: 'Investor update to Apex Ventures is 2 days overdue. Was due June 25th. Flagged as high priority. Draft available for your immediate approval.',
    type: 'flagged',
  },
  {
    id: 'oe-6',
    time: '1 hour ago',
    partnerName: 'Follow-up Partner',
    action: 'Prepared contract recommendation',
    details: 'Reviewed the Meridian Corp legal thread and summarised Rachel Torres\'s two options on the indemnification clause. Recommendation prepared for your review.',
    type: 'prepared',
  },
  {
    id: 'oe-7',
    time: '2 hours ago',
    partnerName: 'Communication Partner',
    action: 'Organised inbox',
    details: 'Read and filed 9 overnight messages. 7 required no action and have been archived. Sarah Chen\'s message flagged as requiring your direct reply.',
    type: 'completed',
  },
  {
    id: 'oe-8',
    time: '3 hours ago',
    partnerName: 'Memory Partner',
    action: 'Stored board decision',
    details: 'Logged the decision to shortlist Maya Singh and Daniel Osei for the Head of Engineering role. Linked to Head of Engineering Hire project record.',
    type: 'updated',
  },
]

// ─── Mock: Memory Updates ─────────────────────────────────────────────────────

export const MOCK_MEMORY_UPDATES: MemoryUpdate[] = [
  {
    id: 'mu-1',
    entityType: 'person',
    entityName: 'Marcus Webb',
    change: 'Last contact updated. Term sheet details and negotiation position added to notes.',
    time: '20 min ago',
  },
  {
    id: 'mu-2',
    entityType: 'project',
    entityName: 'Series B Fundraise',
    change: 'Term sheet receipt logged. Status remains active. Governance provisions flagged as outstanding item.',
    time: '20 min ago',
  },
  {
    id: 'mu-3',
    entityType: 'decision',
    entityName: 'Head of Engineering: shortlist to two candidates',
    change: 'Candidate names confirmed: Maya Singh and Daniel Osei. Awaiting budget approval to proceed to offer.',
    time: '3 hours ago',
  },
  {
    id: 'mu-4',
    entityType: 'org',
    entityName: 'Meridian Corp',
    change: 'Legal review status updated to week 3. Indemnification clause added as blocking item.',
    time: '1 hour ago',
  },
]

// ─── Mock: Narrative Summary ──────────────────────────────────────────────────

export const MOCK_WHAT_HAPPENED: string[] = [
  'Your office reviewed 14 items overnight, handled 11 without any input needed from you, and surfaced 3 that require your decision or approval.',
  'The Apex Ventures term sheet and the Meridian contract situation were both reviewed and prepared — briefs and draft responses are ready and waiting.',
  'Memory has been kept current with today\'s developments, including the Series B progress, the Meridian legal status, and the Head of Engineering shortlist.',
]

// ─── Mock: Recommendations ───────────────────────────────────────────────────

export const MOCK_RECOMMENDATIONS: { id: string; text: string; preparedBy: string }[] = [
  {
    id: 'rec-1',
    text: 'Approve the Q3 budget sign-off before the Leadership Sync at 9:30 AM. It is blocking three downstream decisions — the Head of Engineering offer, the product roadmap, and a vendor contract — and your team cannot proceed without it.',
    preparedBy: 'Chief of Staff',
  },
  {
    id: 'rec-2',
    text: 'Send the investor update to Apex Ventures before the Board Prep this afternoon. It is two days overdue, and Anjali Mehra will be in the room — it is better to have it in her inbox before you sit down together.',
    preparedBy: 'Chief of Staff',
  },
]
