// Plan definitions — no billing logic here, only feature gates and limits.
// Billing integration consults these definitions; it never defines them.

export type Plan = 'free' | 'starter' | 'professional' | 'enterprise'

export interface PlanLimits {
  messagesPerMonth: number | null  // null = unlimited
  aiProcessingPerDay: number | null
  connectors: number | null
  teamMembers: number | null
  knowledgeNotes: number | null
  briefsPerDay: number | null
}

export interface PlanFeatures {
  calendarSync: boolean
  whatsapp: boolean
  teamMode: boolean
  advancedAnalytics: boolean
  customConnectors: boolean
  prioritySupport: boolean
  ssoSaml: boolean
  auditExport: boolean
}

export interface PlanDefinition {
  name: Plan
  displayName: string
  limits: PlanLimits
  features: PlanFeatures
}

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    name: 'free',
    displayName: 'Free',
    limits: {
      messagesPerMonth: 500,
      aiProcessingPerDay: 50,
      connectors: 1,
      teamMembers: 1,
      knowledgeNotes: 100,
      briefsPerDay: 1,
    },
    features: {
      calendarSync: false,
      whatsapp: false,
      teamMode: false,
      advancedAnalytics: false,
      customConnectors: false,
      prioritySupport: false,
      ssoSaml: false,
      auditExport: false,
    },
  },
  starter: {
    name: 'starter',
    displayName: 'Starter',
    limits: {
      messagesPerMonth: 2000,
      aiProcessingPerDay: 200,
      connectors: 2,
      teamMembers: 1,
      knowledgeNotes: 500,
      briefsPerDay: 3,
    },
    features: {
      calendarSync: true,
      whatsapp: false,
      teamMode: false,
      advancedAnalytics: false,
      customConnectors: false,
      prioritySupport: false,
      ssoSaml: false,
      auditExport: false,
    },
  },
  professional: {
    name: 'professional',
    displayName: 'Professional',
    limits: {
      messagesPerMonth: null,
      aiProcessingPerDay: null,
      connectors: 5,
      teamMembers: 5,
      knowledgeNotes: null,
      briefsPerDay: null,
    },
    features: {
      calendarSync: true,
      whatsapp: true,
      teamMode: true,
      advancedAnalytics: true,
      customConnectors: false,
      prioritySupport: true,
      ssoSaml: false,
      auditExport: true,
    },
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    limits: {
      messagesPerMonth: null,
      aiProcessingPerDay: null,
      connectors: null,
      teamMembers: null,
      knowledgeNotes: null,
      briefsPerDay: null,
    },
    features: {
      calendarSync: true,
      whatsapp: true,
      teamMode: true,
      advancedAnalytics: true,
      customConnectors: true,
      prioritySupport: true,
      ssoSaml: true,
      auditExport: true,
    },
  },
}

export function getPlan(plan: string): PlanDefinition {
  return PLANS[plan as Plan] ?? PLANS.free
}

export function hasFeature(plan: string, feature: keyof PlanFeatures): boolean {
  return getPlan(plan).features[feature] === true
}

export function getLimit(plan: string, limit: keyof PlanLimits): number | null {
  return getPlan(plan).limits[limit]
}

export function withinLimit(plan: string, limit: keyof PlanLimits, current: number): boolean {
  const max = getLimit(plan, limit)
  return max === null || current < max
}
