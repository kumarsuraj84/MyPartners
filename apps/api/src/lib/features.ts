import { getCategoryConfig } from './config.js'
import { hasFeature as planHasFeature } from './plans.js'
import type { PlanFeatures } from './plans.js'

export type FeatureFlag = keyof PlanFeatures

// A feature is enabled if both:
//   1. The tenant's plan includes it (plan-level gate), AND
//   2. The tenant's feature_flags config has not explicitly disabled it
//
// This allows per-tenant overrides within plan constraints.
export async function isEnabled(
  tenantId: string,
  flag: FeatureFlag,
  userPlan: string,
): Promise<boolean> {
  if (!planHasFeature(userPlan, flag)) return false
  const flags = await getCategoryConfig<Record<string, boolean>>(tenantId, 'feature_flags')
  // Absent from config = plan default applies; explicit false = override disabled
  return flags[flag] !== false
}

export async function getAllFlags(
  tenantId: string,
  userPlan: string,
): Promise<Record<FeatureFlag, boolean>> {
  const flags = await getCategoryConfig<Record<string, boolean>>(tenantId, 'feature_flags')
  const featureKeys: FeatureFlag[] = [
    'calendarSync', 'whatsapp', 'teamMode', 'advancedAnalytics',
    'customConnectors', 'prioritySupport', 'ssoSaml', 'auditExport',
  ]
  return Object.fromEntries(
    featureKeys.map(k => [k, planHasFeature(userPlan, k) && flags[k] !== false]),
  ) as Record<FeatureFlag, boolean>
}
