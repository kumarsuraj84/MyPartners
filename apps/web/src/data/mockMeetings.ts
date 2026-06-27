// ─── Meetings ─────────────────────────────────────────────────────────────────

export interface Meeting {
  id: string
  title: string
  time: string
  duration: string
  attendees: string[]
  location: string
  context: string
  preparedBy: string
  hasBrief: boolean
}

export const MOCK_MEETINGS: Meeting[] = [
  {
    id: 'meet-1',
    title: 'Leadership Sync',
    time: '9:30 AM',
    duration: '45 min',
    attendees: ['Sarah Chen', 'James Okafor', 'Priya Nair', 'Tom Rutherford'],
    location: 'Board Room A',
    context: 'Weekly leadership sync to review Q3 tracking, surface blockers, and align on the hiring pipeline. Sarah is likely to raise the Head of Engineering vacancy — the Q3 budget approval is a prerequisite before an offer can be extended. James will update on the Meridian contract status.',
    preparedBy: 'Meeting Partner',
    hasBrief: true,
  },
  {
    id: 'meet-2',
    title: 'Board Prep',
    time: '2:00 PM',
    duration: '60 min',
    attendees: ['David Lorne', 'Anjali Mehra', 'Richard Holt', 'Suraj'],
    location: 'Executive Conference Room',
    context: 'Preparatory session ahead of Thursday\'s full board call. David Lorne (Board Chair) has requested a dry run of the Q3 revenue variance explanation. Anjali Mehra from Apex Ventures will join remotely — this is an opportunity to align on the Series B timeline before the formal call. Prepare clear, concise talking points on the 8% revenue miss and the mitigation plan.',
    preparedBy: 'Meeting Partner',
    hasBrief: true,
  },
  {
    id: 'meet-3',
    title: '1:1 with Sarah Chen',
    time: '4:00 PM',
    duration: '30 min',
    attendees: ['Sarah Chen'],
    location: 'Your Office',
    context: 'Monthly 1:1 with your Chief People Officer. Sarah sent a message earlier this week referencing the conversation at the Q2 offsite about extending her mandate into culture and organisational design. This is a direct reply only you can provide. She is also likely to raise the Head of Engineering search timeline, which is currently blocked by the budget approval.',
    preparedBy: 'Meeting Partner',
    hasBrief: false,
  },
]
