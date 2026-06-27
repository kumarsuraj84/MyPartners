// ─── Memory Types ─────────────────────────────────────────────────────────────

export interface MemoryPerson {
  id: string
  name: string
  role: string
  company: string
  email: string
  lastContact: string
  relationship: string
  notes: string
  linkedOrgId?: string
}

export interface MemoryOrganization {
  id: string
  name: string
  domain: string
  type: 'investor' | 'client' | 'partner' | 'vendor'
  contactCount: number
  notes: string
  linkedProjects: string[]
}

export interface MemoryProject {
  id: string
  name: string
  status: 'active' | 'paused' | 'closed'
  owner: string
  notes: string
  linkedOrgId?: string
  decisions: string[]
}

export interface MemoryDecision {
  id: string
  title: string
  date: string
  outcome: string
  linkedProject?: string
  madeBy: string
  context: string
}

// ─── Mock: People ─────────────────────────────────────────────────────────────

export const MOCK_PERSONS: MemoryPerson[] = [
  {
    id: 'person-1',
    name: 'Marcus Webb',
    role: 'Partner',
    company: 'Apex Ventures',
    email: 'marcus.webb@apexventures.com',
    lastContact: 'Yesterday, 3:41 PM',
    relationship: 'Lead investor contact for the Series B round. Responsive and commercially minded. Prefers concise written updates over calls.',
    notes: 'Sent updated term sheet June 26th. Previously flagged governance provisions in section 4.2 as a sticking point. Has a relationship with David Lorne (Board Chair) from a prior fund.',
    linkedOrgId: 'org-1',
  },
  {
    id: 'person-2',
    name: 'Anjali Mehra',
    role: 'Principal',
    company: 'Apex Ventures',
    email: 'anjali.mehra@apexventures.com',
    lastContact: 'Jun 24, 2026',
    relationship: 'Day-to-day due diligence contact at Apex. Extremely detail-oriented. Runs the financial and commercial review process.',
    notes: 'Requested updated three-year projections for the Series B model. Joining the Board Prep call on June 27th remotely. Works closely with Marcus on deal terms.',
    linkedOrgId: 'org-1',
  },
  {
    id: 'person-3',
    name: 'Sarah Chen',
    role: 'Chief People Officer',
    company: 'Internal',
    email: 'sarah.chen@citykart.org',
    lastContact: 'Today, 8:07 AM',
    relationship: 'Direct report and trusted leadership team member. Candid, strategic, and deeply invested in the culture. Has been with the company since Series A.',
    notes: 'Raised mandate expansion at Q2 offsite — wants to own organisational design in addition to people ops. Waiting on Head of Engineering search approval, which is blocked by Q3 budget sign-off. Personal reply required.',
    linkedOrgId: undefined,
  },
  {
    id: 'person-4',
    name: 'Rachel Torres',
    role: 'General Counsel',
    company: 'Internal',
    email: 'rachel.torres@citykart.org',
    lastContact: 'Jun 25, 2026',
    relationship: 'General Counsel. Meticulous and risk-aware. Flags issues early — if she escalates, it is worth paying attention.',
    notes: 'Waiting on position regarding Meridian Corp indemnification clauses (section 7). Has flagged this as blocking the signature process. Due date: June 28th.',
    linkedOrgId: undefined,
  },
  {
    id: 'person-5',
    name: 'David Lorne',
    role: 'Board Chair',
    company: 'Board of Directors',
    email: 'david.lorne@boardadvisors.com',
    lastContact: 'Jun 22, 2026',
    relationship: 'Board Chair. Former operator with a CFO background. Focuses on financial discipline and clear communication. Values brevity and directness.',
    notes: 'Requested a dry run of the Q3 revenue variance explanation before the formal board call. Has pre-existing relationship with Marcus Webb from prior fund (Clearwater Capital). Confirmed attendance for Thursday board call.',
    linkedOrgId: undefined,
  },
]

// ─── Mock: Organisations ──────────────────────────────────────────────────────

export const MOCK_ORGANIZATIONS: MemoryOrganization[] = [
  {
    id: 'org-1',
    name: 'Apex Ventures',
    domain: 'apexventures.com',
    type: 'investor',
    contactCount: 2,
    notes: 'Lead investor in the upcoming Series B round. Current valuation discussion is at $48M pre-money. Term sheet received June 26th. Key sticking point: governance provisions in section 4.2 regarding board seat composition.',
    linkedProjects: ['proj-1'],
  },
  {
    id: 'org-2',
    name: 'Meridian Corp',
    domain: 'meridiancorp.com',
    type: 'client',
    contactCount: 1,
    notes: 'Enterprise client — largest contract to date. Annual contract value approximately $1.2M. Currently in week 3 of legal review. Blocking item: indemnification clause in section 7. Statement of work finalisation is blocked until contract is signed.',
    linkedProjects: ['proj-2'],
  },
  {
    id: 'org-3',
    name: 'Vertex Legal Partners',
    domain: 'vertexlegal.com',
    type: 'vendor',
    contactCount: 1,
    notes: 'Outside counsel engaged for the Series B transaction and the Meridian contract review. Rachel Torres coordinates directly. Billing on a retainer plus hourly for Series B. Strong M&A practice but less experienced on SaaS commercial terms.',
    linkedProjects: ['proj-1', 'proj-2'],
  },
  {
    id: 'org-4',
    name: 'Northbridge Capital',
    domain: 'northbridgecap.com',
    type: 'investor',
    contactCount: 1,
    notes: 'Existing Series A investor. Committed to participating in Series B at a reduced pro-rata. Not the lead. No action items currently open. Quarterly update last sent April 15th.',
    linkedProjects: ['proj-1'],
  },
]

// ─── Mock: Projects ───────────────────────────────────────────────────────────

export const MOCK_PROJECTS: MemoryProject[] = [
  {
    id: 'proj-1',
    name: 'Series B Fundraise',
    status: 'active',
    owner: 'Suraj',
    notes: 'Target raise: $15M. Lead: Apex Ventures. Close target: Q3 2026. Term sheet received June 26th. Board approval required before signing. Updated three-year financial model being prepared by Priya Nair. Key risk: governance provisions still unresolved.',
    linkedOrgId: 'org-1',
    decisions: ['dec-1', 'dec-2'],
  },
  {
    id: 'proj-2',
    name: 'Meridian Corp Commercial Contract',
    status: 'active',
    owner: 'James Okafor',
    notes: 'First enterprise contract at this scale. ACV $1.2M over 24 months. Legal review in progress — week 3. Blocking item: indemnification clause in section 7. Rachel Torres managing legal process. Target signature: end of June 2026.',
    linkedOrgId: 'org-2',
    decisions: ['dec-3'],
  },
  {
    id: 'proj-3',
    name: 'Head of Engineering Hire',
    status: 'paused',
    owner: 'Sarah Chen',
    notes: 'Role was approved in Q2 planning but offer cannot be extended until Q3 budget is formally signed off. Two strong candidates have completed final interviews: Maya Singh (ex-Stripe) and Daniel Osei (ex-Monzo). Offer package pending budget approval.',
    linkedOrgId: undefined,
    decisions: ['dec-4'],
  },
]

// ─── Mock: Decisions ─────────────────────────────────────────────────────────

export const MOCK_DECISIONS: MemoryDecision[] = [
  {
    id: 'dec-1',
    title: 'Budget approval threshold raised to $50K',
    date: 'Jun 20, 2026',
    outcome: 'Approved. Expenditure below $50K can now be approved by department heads without executive sign-off. Expenditure above $50K requires Suraj\'s approval.',
    linkedProject: 'proj-1',
    madeBy: 'Suraj',
    context: 'Decision made to reduce operational bottlenecks ahead of a period of rapid hiring. Finance team flagged that the previous $20K threshold was creating weekly delays in procurement.',
  },
  {
    id: 'dec-2',
    title: 'Series B: accept Apex Ventures as lead investor',
    date: 'Jun 18, 2026',
    outcome: 'Decided to proceed with Apex Ventures as the lead for the Series B, with Northbridge Capital participating at reduced pro-rata. Decision to decline Clearwater Capital\'s indicative offer.',
    linkedProject: 'proj-1',
    madeBy: 'Suraj + Board',
    context: 'Clearwater Capital offered a higher valuation but required a majority board seat. Apex Ventures offered better governance terms and a stronger strategic network for the commercial growth phase.',
  },
  {
    id: 'dec-3',
    title: 'Accept Meridian Corp enterprise contract structure',
    date: 'Jun 10, 2026',
    outcome: 'Approved a 24-month structure at $1.2M ACV with a 90-day exit clause. Legal review initiated. Indemnification terms remain under negotiation.',
    linkedProject: 'proj-2',
    madeBy: 'Suraj + James Okafor',
    context: 'Commercial team proposed a 36-month term to maximise ACV but Meridian\'s procurement team required flexibility. 24 months with a renewal option was the agreed compromise.',
  },
  {
    id: 'dec-4',
    title: 'Head of Engineering: shortlist to two candidates',
    date: 'Jun 15, 2026',
    outcome: 'Maya Singh and Daniel Osei advanced to final round. Offer to be extended following Q3 budget approval. Sarah Chen leading the process.',
    linkedProject: 'proj-3',
    madeBy: 'Suraj + Sarah Chen',
    context: 'Five candidates were interviewed across two rounds. The decision to shortlist two was made to preserve optionality while awaiting budget confirmation.',
  },
]
