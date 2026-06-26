import { prisma } from './prisma.js'

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'restored'
  | 'connected'
  | 'disconnected'
  | 'synced'
  | 'approved'
  | 'dismissed'
  | 'completed'
  | 'config_changed'
  | 'role_changed'
  | 'plan_changed'
  | 'ai_provider_changed'
  | 'feature_flag_changed'

export interface AuditParams {
  tenantId: string
  userId: string
  action: AuditAction
  entity: string
  entityId?: string
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
}

/** Appends an immutable audit record. Fire-and-forget — errors are logged, never thrown. */
export async function audit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before !== undefined ? (params.before as never) : undefined,
        after: params.after !== undefined ? (params.after as never) : undefined,
        metadata: params.metadata !== undefined ? (params.metadata as never) : undefined,
      },
    })
  } catch (err) {
    console.error('[audit] failed to write audit log', err)
  }
}
