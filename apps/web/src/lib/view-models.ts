export interface DecisionViewModel {
  id: string
  title: string
  category: string
  priority: 'urgent' | 'today' | 'waiting'
  escalation: 'important' | 'urgent' | 'critical'
  recommendation: string
  whyItMatters: string
  businessImpact: string
  actionIfDelayed?: string      // what happens if not decided today
  confidenceLevel: 'high' | 'medium' | 'low' | 'needs-review'
  confidenceNote?: string
  suggestedDeadline?: string    // e.g. "Today by 5pm" | "This week"
  relatedDecisions?: RelatedDecisionViewModel[]
  context: string[]
  preparedBy: string
  preparedAt: string
  estimatedTime: string
}

export interface RelatedDecisionViewModel {
  id: string
  title: string
  relationship: string          // e.g. "Blocking" | "Related" | "Consequent"
}

export interface RecommendationViewModel {
  id: string
  text: string
  rationale: string
  preparedBy: string
  confidence: 'high' | 'medium' | 'low'
}

export interface ApprovalViewModel {
  id: string
  type: 'draft_response' | 'follow_up' | 'meeting_brief' | 'recommendation' | 'contract'
  title: string
  preparedBy: string
  preparedById: string
  subject: string
  preview: string
  urgency: 'urgent' | 'normal'
  preparedAt: string
  estimatedTime: string
}

export interface BusinessImpactViewModel {
  summary: string               // one-line impact
  detail?: string               // expanded explanation
  actionIfDelayed?: string      // consequence of inaction
  quantified?: string           // e.g. "$40K cost" | "2-week delay"
}

export interface SupportingContextViewModel {
  facts: string[]
  sources?: string[]            // e.g. ["Finance", "Legal", "HR"]
}

export interface ConfidenceViewModel {
  level: 'high' | 'medium' | 'low' | 'needs-review'
  label: string                 // "High Confidence" | "Medium Confidence" | "Needs Review"
  note?: string
  filledBars: 1 | 2 | 3
}

export interface AttentionItemViewModel {
  id: string
  title: string
  reason: string
  urgency: 'high' | 'normal'
  actionNeeded: string
  flaggedBy: string
  flaggedById: string
  estimatedTime?: string
}

export interface MeetingViewModel {
  id: string
  title: string
  time: string
  duration: string
  attendees: string[]
  hasBrief: boolean
  briefStatus: 'ready' | 'preparing' | 'unavailable'
  context?: string
}

export interface CommitmentViewModel {
  id: string
  title: string
  owner: string
  dueDate: string
  daysUntilDue: number
  isOverdue: boolean
  category: 'you-owe' | 'owed-to-you'
  priority: 'high' | 'normal'
}

// ── Helper: derive ConfidenceViewModel from level ─────────────────────────
export function toConfidenceViewModel(level: 'high' | 'medium' | 'low' | 'needs-review', note?: string): ConfidenceViewModel {
  const map = {
    high:           { label: 'High Confidence',   filledBars: 3 as const },
    medium:         { label: 'Medium Confidence', filledBars: 2 as const },
    low:            { label: 'Needs Review',       filledBars: 1 as const },
    'needs-review': { label: 'Needs Review',       filledBars: 1 as const },
  }
  return { level, ...map[level], note }
}
