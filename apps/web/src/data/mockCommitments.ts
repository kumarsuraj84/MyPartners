// ─── Commitments ─────────────────────────────────────────────────────────────

export type CommitmentCategory = 'you-owe' | 'owed-to-you'
export type CommitmentPriority = 'high' | 'normal'

export interface Commitment {
  id: string
  title: string
  owner: string
  dueDate: string
  daysUntilDue: number
  isOverdue: boolean
  category: CommitmentCategory
  priority: CommitmentPriority
  context: string
}

export const MOCK_COMMITMENTS: Commitment[] = [
  {
    id: 'com-1',
    title: 'Monthly investor update to Apex Ventures',
    owner: 'You',
    dueDate: 'Jun 25, 2026',
    daysUntilDue: -2,
    isOverdue: true,
    category: 'you-owe',
    priority: 'high',
    context: 'You committed to sending a monthly written update to Apex Ventures by the 25th of each month. It is now the 27th. Marcus Webb has not yet followed up, but this is the kind of slip that quietly erodes investor confidence. Your office has a draft ready for your approval.',
  },
  {
    id: 'com-2',
    title: 'Respond to Legal on Meridian contract terms',
    owner: 'You',
    dueDate: 'Jun 28, 2026',
    daysUntilDue: 1,
    isOverdue: false,
    category: 'you-owe',
    priority: 'high',
    context: 'Rachel Torres (General Counsel) is waiting on your position regarding indemnification clauses in section 7 of the Meridian Corp agreement. She flagged this as blocking the signature process. Due tomorrow.',
  },
  {
    id: 'com-3',
    title: 'Product roadmap sign-off from Engineering',
    owner: 'Tom Rutherford',
    dueDate: 'Jun 30, 2026',
    daysUntilDue: 3,
    isOverdue: false,
    category: 'owed-to-you',
    priority: 'normal',
    context: 'Tom committed to delivering the H2 product roadmap document by end of June following last week\'s product review. This is needed before the board call to confirm strategic alignment. He has not yet indicated it is ready.',
  },
  {
    id: 'com-4',
    title: 'Updated Series B financial projections from Finance',
    owner: 'Priya Nair',
    dueDate: 'Jul 1, 2026',
    daysUntilDue: 4,
    isOverdue: false,
    category: 'owed-to-you',
    priority: 'high',
    context: 'Apex Ventures requested updated three-year projections as part of the Series B due diligence process. Priya Nair (CFO) committed to delivering a revised model by July 1st. Anjali Mehra at Apex has this on her checklist for the board call.',
  },
  {
    id: 'com-5',
    title: 'Introduction to James Okafor for Meridian partnership',
    owner: 'You',
    dueDate: 'Jul 3, 2026',
    daysUntilDue: 6,
    isOverdue: false,
    category: 'you-owe',
    priority: 'normal',
    context: 'You offered to introduce Marcus Webb to James Okafor (VP Commercial) during your last call, to explore a potential commercial partnership alongside the investment conversation. A warm email introduction was promised before the end of next week.',
  },
]
