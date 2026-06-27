// ─── Types ────────────────────────────────────────────────────────────────────

export type DecisionCategory   = 'Strategic' | 'Financial' | 'Operational' | 'People' | 'External'
export type DecisionPriority   = 'urgent' | 'today' | 'waiting'
export type ConfidenceLevel    = 'high' | 'medium' | 'low'
export type DecisionFilter     = 'urgent' | 'today' | 'waiting' | 'all'

export interface Decision {
  id: string
  title: string
  category: DecisionCategory
  priority: DecisionPriority
  recommendation: string
  whyItMatters: string
  businessImpact: string
  confidenceLevel: ConfidenceLevel
  confidenceNote?: string       // shown when confidence < high
  preparedBy: string
  preparedAt: string
  estimatedTime: string         // "5 min", "10 min"
  context: string[]             // supporting facts, 2–4 items
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const DECISIONS: Decision[] = [
  {
    id: 'dec-1',
    title: 'Approve Series B term sheet extension request',
    category: 'Strategic',
    priority: 'urgent',
    recommendation: 'Request a 10-day extension from Apex Ventures to review the governance provisions in section 4.2.',
    whyItMatters:
      'Section 4.2 grants investors veto rights over executive hires at VP level and above. Accepting the current terms limits your ability to build the leadership team independently. A 10-day extension is standard practice and Marcus Webb is unlikely to object.',
    businessImpact:
      'Accepting as-is locks in an investor veto structure that could delay critical hires by 4–8 weeks per role. Requesting an extension costs nothing. Failing to respond today risks the term sheet lapsing.',
    confidenceLevel: 'high',
    preparedBy: 'Chief of Staff',
    preparedAt: '18 min ago',
    estimatedTime: '5 min',
    context: [
      'Apex Ventures sent the term sheet Tuesday — response window closes Friday',
      'Three comparable Series B deals in the last 18 months removed the veto provision on request',
      'Marcus Webb indicated flexibility in a side note to the Communication Partner\'s summary',
      'Legal has reviewed and confirmed the extension request requires no counter-signature',
    ],
  },
  {
    id: 'dec-2',
    title: 'Confirm Head of Engineering offer to David Park',
    category: 'People',
    priority: 'urgent',
    recommendation: 'Confirm the offer: $180K base, 0.8% equity, 4-year vest, start date 1 September.',
    whyItMatters:
      'The engineering team has been operating without a senior leader for 11 weeks. Two product initiatives are delayed as a result. David passed all technical and leadership assessments with high marks — this is the right hire.',
    businessImpact:
      'David has a competing offer expiring Friday. Restarting the search takes 10–14 weeks and an estimated $40K in recruiter fees. Confirming today secures a strong leader and unblocks the Q4 roadmap.',
    confidenceLevel: 'high',
    preparedBy: 'Chief of Staff',
    preparedAt: '1 hour ago',
    estimatedTime: '5 min',
    context: [
      'David Park: 12 years in engineering leadership, previous VP Eng at a Series C fintech',
      'All 4 technical interviews rated "strong hire"; references from 2 previous CEOs confirmed',
      'Competing offer is from a well-funded startup — compensation is comparable',
      'Talent team has confirmed the offer terms are within approved budget',
    ],
  },
  {
    id: 'dec-3',
    title: 'Approve Q3 budget reallocation — Marketing to Product',
    category: 'Financial',
    priority: 'today',
    recommendation: 'Approve the $200K reallocation from the Q3 marketing reserve to product engineering.',
    whyItMatters:
      'Two critical product features — the API integration layer and the customer dashboard redesign — are blocked waiting on two additional engineers. The marketing reserve was contingency funding that has not been committed.',
    businessImpact:
      'Approving today keeps both features on track for Q4 launch. Delaying by one week pushes the launch by three weeks due to sprint scheduling. The marketing team has confirmed the reserve is not needed this quarter.',
    confidenceLevel: 'high',
    preparedBy: 'Chief of Staff',
    preparedAt: '2 hours ago',
    estimatedTime: '5 min',
    context: [
      'Marketing confirmed the Q3 reserve ($200K) is uncommitted and available for reallocation',
      'CFO reviewed and pre-approved subject to your sign-off',
      'Product team needs the two engineers contracted by 30 July to hit the sprint schedule',
      'Delay scenario: missing the launch window costs an estimated 6–8 weeks of user acquisition',
    ],
  },
  {
    id: 'dec-4',
    title: 'Approve Meridian Corp contract with exclusivity amendment',
    category: 'External',
    priority: 'today',
    recommendation: 'Approve the contract — but require removal of the exclusivity clause in section 7 before signing.',
    whyItMatters:
      'The exclusivity clause prevents working with any of Meridian\'s sector competitors for 18 months. Three of your five growth-stage prospects are in that sector. The contract value ($340K) does not justify the strategic constraint.',
    businessImpact:
      'Approving with the amendment locks in $340K in revenue and preserves your ability to pursue the three pipeline prospects. Meridian\'s legal team has indicated they will likely accept — their counsel flagged the clause as boilerplate.',
    confidenceLevel: 'medium',
    confidenceNote: 'Meridian\'s response to the amendment request is not yet confirmed.',
    preparedBy: 'Follow-up Partner',
    preparedAt: '3 hours ago',
    estimatedTime: '10 min',
    context: [
      'Contract value: $340K over 18 months, recurring quarterly',
      'Section 7 exclusivity applies to 6 named competitors — 3 are active pipeline prospects',
      'Legal reviewed and recommends removing section 7 entirely or limiting to 6 months',
      'Meridian\'s counsel described section 7 as "standard template" — likely negotiable',
    ],
  },
  {
    id: 'dec-5',
    title: 'Approve Q4 product roadmap — mobile deprioritised',
    category: 'Operational',
    priority: 'today',
    recommendation: 'Approve the roadmap with the mobile app feature moved to Q1 next year.',
    whyItMatters:
      'Engineering capacity supports either the core performance improvements or the mobile app feature — not both. The performance work directly addresses the top three support complaints and has a higher user impact score.',
    businessImpact:
      'Approving unlocks sprint planning for the full engineering team and unblocks the product design team for Q4 deliverables. Deferring the decision by another week costs one sprint of planning time across 8 people.',
    confidenceLevel: 'high',
    preparedBy: 'Meeting Partner',
    preparedAt: '4 hours ago',
    estimatedTime: '5 min',
    context: [
      'Engineering capacity for Q4: 8 engineers × 10 sprints = 80 sprint-points available',
      'Core improvements require 55 points; mobile feature requires 60 points — both cannot fit',
      'User research scores: core improvements 8.4/10 impact; mobile app 6.1/10 impact',
      'PM, design, and engineering have all aligned on this recommendation independently',
    ],
  },
  {
    id: 'dec-6',
    title: 'Respond to James Whitfield\'s request for a one-on-one',
    category: 'External',
    priority: 'waiting',
    recommendation: 'Schedule the meeting for next Tuesday and prepare a Series B and Q3 financials briefing.',
    whyItMatters:
      'James Whitfield has been the quietest board member since the Q3 revenue miss. Proactively engaging him before the board call — rather than waiting for him to raise concerns publicly — is the lower-risk path.',
    businessImpact:
      'A well-prepared bilateral meeting significantly reduces the chance of a contentious board session. If he\'s already heard your framing, the board call becomes a formality rather than a surprise.',
    confidenceLevel: 'low',
    confidenceNote: 'Meeting topic unconfirmed — preparing for financials is the most likely but not certain focus.',
    preparedBy: 'Chief of Staff',
    preparedAt: '5 hours ago',
    estimatedTime: '10 min',
    context: [
      'James Whitfield\'s assistant reached out Wednesday — no stated topic',
      'James has not been proactively in touch since the Q3 variance call in May',
      'He holds 12% of the cap table and has a history of raising concerns in full board sessions',
      'His LinkedIn shows recent interest in early-stage financing structures — possibly Series B related',
    ],
  },
  {
    id: 'dec-7',
    title: 'Approve revised sales commission structure — Option B',
    category: 'People',
    priority: 'waiting',
    recommendation: 'Approve structure B: accelerators at 120% and 150% of quota, effective Q4.',
    whyItMatters:
      'Two account executives have signalled they are interviewing externally. The current commission structure is 15% below market median for comparable SaaS AE roles. Replacing each AE costs an estimated $80K in recruiting and ramp time.',
    businessImpact:
      'Structure B increases OTE by an average of $12K per AE annually — total cost $36K for the three-person team. Retention saves $160K+ in replacement costs if two AEs leave. The structure also creates a clear upside incentive tied to over-performance.',
    confidenceLevel: 'medium',
    confidenceNote: 'Two of three AEs have confirmed they are considering other offers; the third is unconfirmed.',
    preparedBy: 'Chief of Staff',
    preparedAt: '6 hours ago',
    estimatedTime: '10 min',
    context: [
      'Current OTE: $120K base + up to $40K commission at 100% quota',
      'Structure B: same base, accelerators add $6K at 120% quota and $12K at 150% quota',
      'HR and Sales VP have both reviewed and support structure B',
      'Legal confirmed structure B is compliant with existing employment agreements',
    ],
  },
]

// ─── Derived: filter + count helpers ─────────────────────────────────────────

export function filterDecisions(decisions: Decision[], filter: DecisionFilter): Decision[] {
  switch (filter) {
    case 'urgent':  return decisions.filter(d => d.priority === 'urgent')
    case 'today':   return decisions.filter(d => d.priority === 'urgent' || d.priority === 'today')
    case 'waiting': return decisions.filter(d => d.priority === 'waiting')
    case 'all':     return decisions
  }
}

export function countByFilter(decisions: Decision[]): Record<DecisionFilter, number> {
  return {
    urgent:  decisions.filter(d => d.priority === 'urgent').length,
    today:   decisions.filter(d => d.priority === 'urgent' || d.priority === 'today').length,
    waiting: decisions.filter(d => d.priority === 'waiting').length,
    all:     decisions.length,
  }
}

export function countByCategory(decisions: Decision[]): Partial<Record<DecisionCategory, number>> {
  return decisions.reduce<Partial<Record<DecisionCategory, number>>>((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + 1
    return acc
  }, {})
}
