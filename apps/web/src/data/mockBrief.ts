// ─── Morning Brief ────────────────────────────────────────────────────────────

export interface MorningBrief {
  greeting: string
  officeNote: string
  situationSummary: string[]
  topPriority: string
  preparedAt: string
  decisionsReady: number
  commitmentsOverdue: number
  meetingsToday: number
  approvalsPending: number
}

export const MOCK_BRIEF: MorningBrief = {
  greeting: 'Good morning, Suraj.',
  officeNote: 'Your office has prepared today\'s priorities.',
  situationSummary: [
    'The Apex Ventures Series B conversation is at a critical juncture — Marcus Webb responded to the term sheet yesterday and the board is awaiting your position before the end of next week.',
    'The Meridian Corp contract has been in legal review for three weeks and is now blocking a signed statement of work that Finance needs to close the quarter.',
    'Internally, the Q3 budget sign-off remains the single item blocking the most downstream decisions, including the Head of Engineering hire and the product roadmap.',
  ],
  topPriority: 'Approve the Series B draft reply to Marcus Webb — it is time-sensitive and your team is waiting to proceed.',
  preparedAt: 'Updated 4 minutes ago',
  decisionsReady: 3,
  commitmentsOverdue: 1,
  meetingsToday: 3,
  approvalsPending: 2,
}
