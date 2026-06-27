export type PartnerStatus =
  | 'Reviewing'
  | 'Preparing'
  | 'Organizing'
  | 'Following Up'
  | 'Waiting for Approval'
  | 'Ready'

export interface PartnerActivity {
  id: string
  time: string
  description: string
  partnerId: string
  partnerName: string
}

export interface PartnerStat {
  label: string
  value: string
}

export interface Partner {
  id: string
  name: string
  role: string
  description: string
  status: PartnerStatus
  focus: string
  color: string         // Tailwind bg class for the avatar
  iconColor: string     // Tailwind text class for icon inside avatar
  activities: PartnerActivity[]
  stats: PartnerStat[]
}

export const PARTNERS: Partner[] = [
  {
    id: 'chief-of-staff',
    name: 'Chief of Staff',
    role: 'Office Coordination',
    description:
      'Oversees all office activity, coordinates between partners, and ensures only the decisions that need you reach your desk.',
    status: 'Reviewing',
    focus: 'Reviewing this morning\'s brief and coordinating 2 time-sensitive items before your first call.',
    color: 'bg-primary',
    iconColor: 'text-white',
    stats: [
      { label: 'Items reviewed', value: '14' },
      { label: 'Decisions surfaced', value: '3' },
      { label: 'Handled silently', value: '11' },
    ],
    activities: [
      { id: 'cos-1', time: '4 min ago', description: 'Reviewed morning brief and flagged 3 items for your attention', partnerId: 'chief-of-staff', partnerName: 'Chief of Staff' },
      { id: 'cos-2', time: '12 min ago', description: 'Coordinated with Communication Partner on the Meridian Corp thread', partnerId: 'chief-of-staff', partnerName: 'Chief of Staff' },
      { id: 'cos-3', time: '1 hour ago', description: 'Updated decision list — Q3 budget sign-off moved to top priority', partnerId: 'chief-of-staff', partnerName: 'Chief of Staff' },
    ],
  },
  {
    id: 'communication',
    name: 'Communication Partner',
    role: 'Inbox & Messages',
    description:
      'Reads every message, extracts what matters, drafts context so you never have to triage from scratch.',
    status: 'Preparing',
    focus: 'Preparing a summary of 9 new messages since yesterday — 2 flagged as requiring your input.',
    color: 'bg-violet-500',
    iconColor: 'text-white',
    stats: [
      { label: 'Messages read', value: '9' },
      { label: 'High priority', value: '2' },
      { label: 'Context drafted', value: '7' },
    ],
    activities: [
      { id: 'com-1', time: '8 min ago', description: 'Read message from Sarah Chen — flagged as high priority, needs your approval', partnerId: 'communication', partnerName: 'Communication Partner' },
      { id: 'com-2', time: '22 min ago', description: 'Reviewed the Apex Ventures thread and added context to business memory', partnerId: 'communication', partnerName: 'Communication Partner' },
      { id: 'com-3', time: '2 hours ago', description: 'Organized 6 newsletter and update emails — none require your attention', partnerId: 'communication', partnerName: 'Communication Partner' },
    ],
  },
  {
    id: 'followup',
    name: 'Follow-up Partner',
    role: 'Commitments & Tracking',
    description:
      'Tracks every commitment you\'ve made, every follow-up you\'re owed, and surfaces what\'s at risk of slipping.',
    status: 'Following Up',
    focus: 'Tracking 6 open commitments — flagging the investor response as overdue by 2 days.',
    color: 'bg-orange-500',
    iconColor: 'text-white',
    stats: [
      { label: 'Commitments open', value: '6' },
      { label: 'Overdue', value: '1' },
      { label: 'Waiting on others', value: '4' },
    ],
    activities: [
      { id: 'fu-1', time: '15 min ago', description: 'Flagged investor update as overdue — was due Tuesday', partnerId: 'followup', partnerName: 'Follow-up Partner' },
      { id: 'fu-2', time: '45 min ago', description: 'Tracked new commitment: respond to Legal on contract terms by Friday', partnerId: 'followup', partnerName: 'Follow-up Partner' },
      { id: 'fu-3', time: '3 hours ago', description: 'Marked the Q2 vendor review as complete after your email confirmation', partnerId: 'followup', partnerName: 'Follow-up Partner' },
    ],
  },
  {
    id: 'meeting',
    name: 'Meeting Partner',
    role: 'Calendar & Preparation',
    description:
      'Monitors your calendar, prepares briefing materials, and captures action items from every meeting.',
    status: 'Organizing',
    focus: 'Organizing prep materials for tomorrow\'s board call — no agenda has been shared yet.',
    color: 'bg-emerald-500',
    iconColor: 'text-white',
    stats: [
      { label: 'Meetings this week', value: '8' },
      { label: 'Notes captured', value: '5' },
      { label: 'Actions extracted', value: '12' },
    ],
    activities: [
      { id: 'meet-1', time: '30 min ago', description: 'Captured 4 action items from yesterday\'s leadership sync and added to your work list', partnerId: 'meeting', partnerName: 'Meeting Partner' },
      { id: 'meet-2', time: '2 hours ago', description: 'Noticed no prep materials for tomorrow\'s board call — flagged to Chief of Staff', partnerId: 'meeting', partnerName: 'Meeting Partner' },
      { id: 'meet-3', time: '4 hours ago', description: 'Organized notes from the product review — decision logged to memory', partnerId: 'meeting', partnerName: 'Meeting Partner' },
    ],
  },
  {
    id: 'memory',
    name: 'Memory Partner',
    role: 'Business Memory',
    description:
      'Builds and maintains your organizational memory — every person, company, project, and decision, always in context.',
    status: 'Ready',
    focus: 'Memory is current. 17 people and 8 organizations tracked. 3 new entries added today.',
    color: 'bg-rose-500',
    iconColor: 'text-white',
    stats: [
      { label: 'People tracked', value: '17' },
      { label: 'Organizations', value: '8' },
      { label: 'Decisions stored', value: '24' },
    ],
    activities: [
      { id: 'mem-1', time: '20 min ago', description: 'Added Marcus Webb (Apex Ventures, Partner) to business memory from today\'s message thread', partnerId: 'memory', partnerName: 'Memory Partner' },
      { id: 'mem-2', time: '1 hour ago', description: 'Connected Apex Ventures to the Series B project record', partnerId: 'memory', partnerName: 'Memory Partner' },
      { id: 'mem-3', time: '4 hours ago', description: 'Stored decision: budget approval threshold moved to $50K, approved by executive', partnerId: 'memory', partnerName: 'Memory Partner' },
    ],
  },
]

export const OFFICE_SUMMARY = {
  itemsReviewedToday: 14,
  commitmentsTracked: 6,
  memoryEntries: 49,
  decisionsReady: 3,
  lastUpdated: '4 minutes ago',
}

export const ALL_ACTIVITIES: PartnerActivity[] = PARTNERS
  .flatMap(p => p.activities)
  .sort((a, b) => {
    // sort by recency using order in array (already ordered)
    const order = ['4 min ago', '8 min ago', '12 min ago', '15 min ago', '20 min ago', '22 min ago', '30 min ago', '45 min ago', '1 hour ago', '2 hours ago', '3 hours ago', '4 hours ago']
    return order.indexOf(a.time) - order.indexOf(b.time)
  })
