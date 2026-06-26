import { prisma } from './prisma.js'

// Default configuration values.
// Tenant-specific overrides stored in TenantConfig table take precedence.
// Add new configurable behaviour here — never hardcode it in route handlers.
export const CONFIG_DEFAULTS: Record<string, Record<string, unknown>> = {
  assistant: {
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    temperature: 0.3,
    maxTokensClassify: 1500,
    maxTokensBrief: 2048,
    maxTokensProcess: 1024,
    language: 'en',
  },
  priority_rules: {
    urgentKeywords: ['urgent', 'asap', 'critical', 'emergency', 'immediately'],
    highKeywords: ['important', 'priority', 'deadline', 'by end of day', 'eod'],
    categories: ['request', 'update', 'fyi', 'decision', 'commitment', 'introduction'],
  },
  business_hours: {
    timezone: 'UTC',
    workingDays: [1, 2, 3, 4, 5], // ISO day numbers: 1=Monday, 7=Sunday
    startHour: 9,
    endHour: 18,
  },
  notifications: {
    urgentEmailEnabled: false,
    dailyBriefTime: '08:00',
    weeklyDigestEnabled: false,
    digestDayOfWeek: 1, // Monday
  },
  reminder_policies: {
    followUpAfterDays: 3,
    escalateAfterDays: 7,
    waitingForReminderDays: 5,
    overdueGracePeriodHours: 2,
  },
  brief: {
    urgentMessagesLimit: 8,
    decisionsLimit: 5,
    commitmentsLimit: 5,
    followUpsLimit: 5,
    waitingForLimit: 5,
    recentDecisionsLimit: 5,
  },
  feature_flags: {
    whatsapp: false,
    calendarSync: false,
    teamMode: false,
    advancedAnalytics: false,
    customConnectors: false,
  },
}

/** Returns a single config value, falling back to the hardcoded default. */
export async function getConfig<T = unknown>(
  tenantId: string,
  category: string,
  key: string,
): Promise<T> {
  const override = await prisma.tenantConfig.findUnique({
    where: { tenantId_category_key: { tenantId, category, key } },
  })
  if (override !== null) return override.value as T
  return (CONFIG_DEFAULTS[category]?.[key] as T) ?? (null as unknown as T)
}

/** Returns all config for a category, merging defaults with tenant overrides. */
export async function getCategoryConfig<T extends Record<string, unknown> = Record<string, unknown>>(
  tenantId: string,
  category: string,
): Promise<T> {
  const overrides = await prisma.tenantConfig.findMany({ where: { tenantId, category } })
  const merged = { ...(CONFIG_DEFAULTS[category] ?? {}) }
  for (const row of overrides) merged[row.key] = row.value
  return merged as T
}

/** Upserts a config value, incrementing the version on update. */
export async function setConfig(
  tenantId: string,
  category: string,
  key: string,
  value: unknown,
  actorId: string,
): Promise<void> {
  await prisma.tenantConfig.upsert({
    where: { tenantId_category_key: { tenantId, category, key } },
    create: { tenantId, category, key, value: value as never, createdBy: actorId, updatedBy: actorId },
    update: { value: value as never, updatedBy: actorId, version: { increment: 1 } },
  })
}
