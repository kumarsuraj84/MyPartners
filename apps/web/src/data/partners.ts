// ─── Status & State Types ─────────────────────────────────────────────────────

export type PartnerStatus =
  | 'Reviewing'
  | 'Preparing'
  | 'Organizing'
  | 'Following Up'
  | 'Waiting for Approval'
  | 'Ready'

/** High-level work state: what is the partner doing right now from the executive's perspective. */
export type WorkState = 'working' | 'waiting' | 'completed'

export type ApprovalType = 'draft_response' | 'follow_up' | 'meeting_brief' | 'recommendation'

// ─── Partner ──────────────────────────────────────────────────────────────────

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
  workState: WorkState
  focus: string
  whyItMatters: string
  color: string
  iconColor: string
  activities: PartnerActivity[]
  stats: PartnerStat[]
}

// ─── Approval Items ───────────────────────────────────────────────────────────

export interface ApprovalItem {
  id: string
  type: ApprovalType
  title: string
  preparedBy: string
  preparedById: string
  subject: string
  preview: string
  urgency: 'urgent' | 'normal'
  preparedAt: string
}

// ─── Attention Items ──────────────────────────────────────────────────────────

export interface AttentionItemData {
  id: string
  title: string
  reason: string
  partnerId: string
  partnerName: string
  actionNeeded: string
  urgency: 'high' | 'normal'
}

// ─── Mock: Partners ───────────────────────────────────────────────────────────

export const PARTNERS: Partner[] = [
  {
    id: 'chief-of-staff',
    name: 'Chief of Staff',
    role: 'Office Coordination',
    description:
      'Oversees all office activity, coordinates between partners, and ensures only the decisions that need you reach your desk.',
    status: 'Reviewing',
    workState: 'working',
    focus: 'Reviewing this morning\'s brief and coordinating 2 time-sensitive items before your first call.',
    whyItMatters:
      'Your time is your most scarce resource. Without coordination, you\'d spend 2–3 hours every morning deciding what to work on. The Chief of Staff ensures your day is structured before you open your first message.',
    color: 'bg-primary',
    iconColor: 'text-white',
    stats: [
      { label: 'Items reviewed', value: '14' },
      { label: 'Decisions surfaced', value: '3' },
      { label: 'Handled silently', value: '11' },
    ],
    activities: [
      { id: 'cos-1', time: '4 min ago',  description: 'Reviewed morning brief and flagged 3 items for your attention',                        partnerId: 'chief-of-staff', partnerName: 'Chief of Staff' },
      { id: 'cos-2', time: '12 min ago', description: 'Coordinated with Communication Partner on the Meridian Corp thread',                   partnerId: 'chief-of-staff', partnerName: 'Chief of Staff' },
      { id: 'cos-3', time: '1 hour ago', description: 'Updated decision list — Q3 budget sign-off moved to top priority',                     partnerId: 'chief-of-staff', partnerName: 'Chief of Staff' },
    ],
  },
  {
    id: 'communication',
    name: 'Communication Partner',
    role: 'Inbox & Messages',
    description:
      'Reads every message, extracts what matters, drafts context so you never have to triage from scratch.',
    status: 'Waiting for Approval',
    workState: 'waiting',
    focus: 'Draft reply to Marcus Webb (Apex Ventures) is ready for your approval.',
    whyItMatters:
      'Every message that reaches you unfiltered costs 3–5 minutes of context-switching. Your Communication Partner reduces your inbox to only the conversations that genuinely need your voice.',
    color: 'bg-violet-500',
    iconColor: 'text-white',
    stats: [
      { label: 'Messages read', value: '9' },
      { label: 'High priority', value: '2' },
      { label: 'Context drafted', value: '7' },
    ],
    activities: [
      { id: 'com-1', time: '8 min ago',   description: 'Read message from Sarah Chen — flagged as high priority, needs your direct reply',     partnerId: 'communication', partnerName: 'Communication Partner' },
      { id: 'com-2', time: '22 min ago',  description: 'Reviewed the Apex Ventures thread and prepared a draft response for your approval',    partnerId: 'communication', partnerName: 'Communication Partner' },
      { id: 'com-3', time: '2 hours ago', description: 'Organised 6 newsletter and update emails — none require your attention',               partnerId: 'communication', partnerName: 'Communication Partner' },
    ],
  },
  {
    id: 'followup',
    name: 'Follow-up Partner',
    role: 'Commitments & Tracking',
    description:
      'Tracks every commitment you\'ve made, every follow-up you\'re owed, and surfaces what\'s at risk of slipping.',
    status: 'Following Up',
    workState: 'working',
    focus: 'Tracking 6 open commitments — investor update is overdue by 2 days.',
    whyItMatters:
      'Broken commitments erode trust faster than almost anything else. Your Follow-up Partner ensures nothing you\'ve promised — or are owed — falls through the cracks, before the other party notices.',
    color: 'bg-orange-500',
    iconColor: 'text-white',
    stats: [
      { label: 'Commitments open', value: '6' },
      { label: 'Overdue', value: '1' },
      { label: 'Waiting on others', value: '4' },
    ],
    activities: [
      { id: 'fu-1', time: '15 min ago',  description: 'Flagged investor update as overdue — was due Tuesday',                                 partnerId: 'followup', partnerName: 'Follow-up Partner' },
      { id: 'fu-2', time: '45 min ago',  description: 'Tracked new commitment: respond to Legal on contract terms by Friday',                 partnerId: 'followup', partnerName: 'Follow-up Partner' },
      { id: 'fu-3', time: '3 hours ago', description: 'Marked Q2 vendor review as complete after your email confirmation',                    partnerId: 'followup', partnerName: 'Follow-up Partner' },
    ],
  },
  {
    id: 'meeting',
    name: 'Meeting Partner',
    role: 'Calendar & Preparation',
    description:
      'Monitors your calendar, prepares briefing materials, and captures action items from every meeting.',
    status: 'Waiting for Approval',
    workState: 'waiting',
    focus: 'Board call brief is prepared and ready for your review.',
    whyItMatters:
      'The 3 minutes before a meeting where you scramble for context are the most expensive in your day. Your Meeting Partner eliminates them — every meeting starts with you already informed.',
    color: 'bg-emerald-500',
    iconColor: 'text-white',
    stats: [
      { label: 'Meetings this week', value: '8' },
      { label: 'Notes captured', value: '5' },
      { label: 'Actions extracted', value: '12' },
    ],
    activities: [
      { id: 'meet-1', time: '30 min ago',  description: 'Captured 4 action items from yesterday\'s leadership sync',                          partnerId: 'meeting', partnerName: 'Meeting Partner' },
      { id: 'meet-2', time: '1 hour ago',  description: 'Prepared board call briefing — ready for your approval',                             partnerId: 'meeting', partnerName: 'Meeting Partner' },
      { id: 'meet-3', time: '4 hours ago', description: 'Organised notes from the product review — decision logged to memory',                partnerId: 'meeting', partnerName: 'Meeting Partner' },
    ],
  },
  {
    id: 'memory',
    name: 'Memory Partner',
    role: 'Business Memory',
    description:
      'Builds and maintains your organisational memory — every person, company, project, and decision, always in context.',
    status: 'Ready',
    workState: 'completed',
    focus: 'Memory is current. 17 people and 8 organisations tracked. 3 new entries added today.',
    whyItMatters:
      'Decisions made without historical context get reversed. Relationships managed without notes feel transactional. Your Memory Partner keeps the full picture current so your judgement is always grounded.',
    color: 'bg-rose-500',
    iconColor: 'text-white',
    stats: [
      { label: 'People tracked', value: '17' },
      { label: 'Organisations', value: '8' },
      { label: 'Decisions stored', value: '24' },
    ],
    activities: [
      { id: 'mem-1', time: '20 min ago',  description: 'Added Marcus Webb (Apex Ventures, Partner) to business memory',                       partnerId: 'memory', partnerName: 'Memory Partner' },
      { id: 'mem-2', time: '1 hour ago',  description: 'Connected Apex Ventures to the Series B project record',                              partnerId: 'memory', partnerName: 'Memory Partner' },
      { id: 'mem-3', time: '4 hours ago', description: 'Stored decision: budget approval threshold moved to $50K',                            partnerId: 'memory', partnerName: 'Memory Partner' },
    ],
  },
]

// ─── Mock: Approval Items ─────────────────────────────────────────────────────

export const APPROVAL_ITEMS: ApprovalItem[] = [
  {
    id: 'apr-1',
    type: 'draft_response',
    title: 'Reply to Marcus Webb re: Series B terms',
    preparedBy: 'Communication Partner',
    preparedById: 'communication',
    subject: 'Apex Ventures · Received this morning',
    preview: 'Hi Marcus,\n\nThank you for sharing the updated term sheet. The board will need a few days to discuss the governance provisions in section 4.2. I\'ll revert by end of next week with our position.\n\nLooking forward to moving this forward together.\n\nBest regards',
    urgency: 'urgent',
    preparedAt: '12 min ago',
  },
  {
    id: 'apr-2',
    type: 'follow_up',
    title: 'Follow up with Legal on contract review',
    preparedBy: 'Follow-up Partner',
    preparedById: 'followup',
    subject: 'Meridian Corp contract · Due Friday',
    preview: 'Hi Rachel,\n\nWe\'re now in week 3 of the Meridian contract review. Could you let me know the current status and whether you need anything from us to move forward? We\'re targeting signature by end of month.\n\nThanks',
    urgency: 'normal',
    preparedAt: '45 min ago',
  },
  {
    id: 'apr-3',
    type: 'meeting_brief',
    title: 'Board Call Briefing — Thursday 9am',
    preparedBy: 'Meeting Partner',
    preparedById: 'meeting',
    subject: 'Board of Directors · 5 attendees',
    preview: 'AGENDA\nQ3 financial review · Series B timeline · Product roadmap sign-off\n\nKEY CONTEXT\nQ3 revenue is tracking 8% below plan. Series B lead investor has requested updated projections. Two board members have not confirmed attendance.\n\nRECOMMENDED TALKING POINTS\nAcknowledge revenue variance with mitigation plan. Confirm Series B timeline. Request roadmap sign-off before next sprint.',
    urgency: 'urgent',
    preparedAt: '1 hour ago',
  },
  {
    id: 'apr-4',
    type: 'recommendation',
    title: 'Prioritise Q3 budget sign-off today',
    preparedBy: 'Chief of Staff',
    preparedById: 'chief-of-staff',
    subject: 'Finance · Blocking 3 downstream decisions',
    preview: 'The Q3 budget approval is blocking:\n· Vendor contract finalisation (Legal is waiting)\n· Product roadmap sign-off (PM team is waiting)\n· Head of Engineering hire (Talent is waiting)\n\nApproving the budget today clears all three. Estimated decision time: 10 minutes.',
    urgency: 'normal',
    preparedAt: '4 min ago',
  },
]

// ─── Mock: Attention Items ────────────────────────────────────────────────────

export const ATTENTION_ITEMS: AttentionItemData[] = [
  {
    id: 'att-1',
    title: 'Investor update is 2 days overdue',
    reason: 'You committed to a monthly update to Apex Ventures by the 15th. Today is the 17th. Marcus Webb has not followed up yet — but this will affect trust.',
    partnerId: 'followup',
    partnerName: 'Follow-up Partner',
    actionNeeded: 'Approve the draft response above to send immediately.',
    urgency: 'high',
  },
  {
    id: 'att-2',
    title: 'No agenda received for tomorrow\'s board call',
    reason: 'The board call is at 9am tomorrow. No formal agenda has been distributed by the company secretary.',
    partnerId: 'meeting',
    partnerName: 'Meeting Partner',
    actionNeeded: 'Review the meeting brief above and confirm you\'re prepared.',
    urgency: 'high',
  },
  {
    id: 'att-3',
    title: 'Sarah Chen requires a direct reply',
    reason: 'Her message references a personal commitment you made at the last offsite. A delegated response would be inappropriate.',
    partnerId: 'communication',
    partnerName: 'Communication Partner',
    actionNeeded: 'Check inbox and reply directly — estimated 3 minutes.',
    urgency: 'normal',
  },
]

// ─── Mock: Office Summary ─────────────────────────────────────────────────────

export const OFFICE_SUMMARY = {
  itemsReviewedToday: 14,
  commitmentsTracked: 6,
  memoryEntries: 49,
  decisionsReady: 3,
  lastUpdated: '4 minutes ago',
}

// ─── Derived: Combined Activity Feed ─────────────────────────────────────────

export const ALL_ACTIVITIES: PartnerActivity[] = PARTNERS
  .flatMap(p => p.activities)
  .sort((a, b) => {
    const order = [
      '4 min ago', '8 min ago', '12 min ago', '15 min ago', '20 min ago',
      '22 min ago', '30 min ago', '45 min ago', '1 hour ago', '2 hours ago',
      '3 hours ago', '4 hours ago',
    ]
    return order.indexOf(a.time) - order.indexOf(b.time)
  })
