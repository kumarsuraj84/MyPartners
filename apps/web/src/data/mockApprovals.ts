// ─── Approvals ────────────────────────────────────────────────────────────────
// Note: ApprovalItem in partners.ts uses type ApprovalType = 'draft_response' | 'follow_up' | 'meeting_brief' | 'recommendation'
// This file extends the type with additional values and adds estimatedTime.

export type ApprovalItemType =
  | 'draft_response'
  | 'follow_up'
  | 'meeting_brief'
  | 'recommendation'
  | 'contract'

export interface ApprovalItem {
  id: string
  type: ApprovalItemType
  title: string
  preparedBy: string
  subject: string
  preview: string
  urgency: 'urgent' | 'normal'
  preparedAt: string
  estimatedTime: string
}

export const MOCK_APPROVALS: ApprovalItem[] = [
  {
    id: 'appr-1',
    type: 'draft_response',
    title: 'Reply to Marcus Webb — Series B term sheet',
    preparedBy: 'Communication Partner',
    subject: 'Apex Ventures · Received yesterday, 3:41 PM',
    preview: 'Hi Marcus,\n\nThank you for sending the updated term sheet. The board will need a few days to review the governance provisions in section 4.2 — we want to make sure we\'re fully aligned before responding formally.\n\nI\'ll revert with our position by end of next week. In the meantime, please do not hesitate to reach out if you need anything from our side.\n\nLooking forward to moving this forward together.\n\nWarm regards,\nSuraj',
    urgency: 'urgent',
    preparedAt: '12 min ago',
    estimatedTime: '2 min to review',
  },
  {
    id: 'appr-2',
    type: 'contract',
    title: 'Position on Meridian Corp indemnification clause',
    preparedBy: 'Follow-up Partner',
    subject: 'Meridian Corp · Legal review week 3 · Due June 28',
    preview: 'Rachel has proposed two options for your consideration:\n\nOption A — Accept mutual indemnification with a liability cap of 12 months\' fees (standard for enterprise SaaS). This is the position Legal recommends.\n\nOption B — Push back on the cap and request 6 months\' fees. This risks a further 2-week negotiation delay.\n\nYour office recommends Option A. It is market standard and clears the path to signature by end of month.',
    urgency: 'urgent',
    preparedAt: '1 hour ago',
    estimatedTime: '3 min to decide',
  },
  {
    id: 'appr-3',
    type: 'meeting_brief',
    title: 'Board Prep — Briefing for 2:00 PM today',
    preparedBy: 'Meeting Partner',
    subject: 'Board of Directors · 4 attendees · Executive Conference Room',
    preview: 'AGENDA\nQ3 revenue variance · Series B timeline alignment · Product roadmap sign-off\n\nKEY CONTEXT\nQ3 revenue is tracking 8% below plan (approximately £420K gap). The primary drivers are a delayed enterprise contract (Meridian) and slower-than-forecast SMB acquisition. Anjali Mehra from Apex Ventures is joining remotely — this is an opportunity to align on Series B before Thursday\'s formal call.\n\nRECOMMENDED APPROACH\nLead with the mitigation plan, not the gap. Confirm Series B timeline. Request roadmap sign-off before the next sprint begins.',
    urgency: 'normal',
    preparedAt: '2 hours ago',
    estimatedTime: '5 min to review',
  },
]
