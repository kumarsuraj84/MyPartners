import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

// Urgency values stored on Signal: critical | high | normal
// Map to frontend priority/escalation values
function mapUrgency(urgency: string): { priority: string; escalation: string } {
  switch (urgency) {
    case 'critical':
      return { priority: 'critical', escalation: 'critical' }
    case 'high':
      return { priority: 'urgent', escalation: 'urgent' }
    default:
      return { priority: 'important', escalation: 'important' }
  }
}

function signalToDecision(signal: {
  id: string
  title: string
  reason: string
  businessImpact: string
  suggestedAction: string
  urgency: string
  entityType: string | null
  createdAt: Date
  metadata: unknown
}) {
  const { priority, escalation } = mapUrgency(signal.urgency)
  return {
    id: signal.id,
    title: signal.title,
    category: signal.entityType ?? 'signal',
    priority,
    escalation,
    businessImpactSummary: signal.businessImpact,
    actionIfDelayed: signal.businessImpact,
    suggestedDeadline: null as string | null,
    relatedDecisions: [] as string[],
    recommendation: signal.suggestedAction,
    whyItMatters: signal.reason,
    businessImpact: signal.businessImpact,
    confidenceLevel: null as string | null,
    confidenceNote: null as string | null,
    preparedBy: 'Chief of Staff',
    preparedAt: signal.createdAt.toISOString(),
    estimatedTime: null as string | null,
    context: null as string | null,
    status: 'pending',
  }
}

function dbDecisionToResponse(d: {
  id: string
  title: string
  category: string
  priority: string
  escalation: string
  businessImpactSummary: string
  actionIfDelayed: string | null
  suggestedDeadline: string | null
  relatedDecisions: unknown
  recommendation: string
  whyItMatters: string
  businessImpact: string
  confidenceLevel: string
  confidenceNote: string | null
  preparedBy: string
  estimatedTime: string
  context: unknown
  status: string
  statusNote: string | null
  decidedAt: Date | null
  createdAt: Date
}) {
  return {
    id: d.id,
    title: d.title,
    category: d.category,
    priority: d.priority,
    escalation: d.escalation,
    businessImpactSummary: d.businessImpactSummary,
    actionIfDelayed: d.actionIfDelayed,
    suggestedDeadline: d.suggestedDeadline,
    relatedDecisions: d.relatedDecisions,
    recommendation: d.recommendation,
    whyItMatters: d.whyItMatters,
    businessImpact: d.businessImpact,
    confidenceLevel: d.confidenceLevel,
    confidenceNote: d.confidenceNote,
    preparedBy: d.preparedBy,
    preparedAt: d.createdAt.toISOString(),
    estimatedTime: d.estimatedTime,
    context: d.context,
    status: d.status,
    statusNote: d.statusNote,
    decidedAt: d.decidedAt?.toISOString() ?? null,
  }
}

const RequestChangesBody = z.object({
  note: z.string().optional(),
})

export const decisionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /api/decisions — list pending decisions; DB-backed, falls back to signals
  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }

    const dbDecisions = await prisma.decision.findMany({
      where: { userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })

    if (dbDecisions.length > 0) {
      return dbDecisions.map(dbDecisionToResponse)
    }

    // Fall back to deriving from Signals
    const now = new Date()
    const signals = await prisma.signal.findMany({
      where: {
        userId,
        urgency: { in: ['critical', 'high'] },
        isDismissed: false,
        isResolved: false,
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
      },
      orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
    })

    return signals.map(signalToDecision)
  })

  // POST /api/decisions/:id/approve — mark a decision approved
  fastify.post<{ Params: { id: string } }>('/:id/approve', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params

    // Try Decision table first
    const existing = await prisma.decision.findFirst({ where: { id, userId } })
    if (existing) {
      await prisma.decision.update({
        where: { id },
        data: { status: 'approved', decidedAt: new Date() },
      })
      reply.code(204)
      return
    }

    // Fall back: try Signal, create a Decision record from it, then mark approved
    const signal = await prisma.signal.findFirst({ where: { id, userId } })
    if (signal) {
      const { priority, escalation } = mapUrgency(signal.urgency)
      await prisma.decision.create({
        data: {
          id,
          userId,
          sourceSignalId: signal.id,
          title: signal.title,
          category: signal.entityType ?? 'signal',
          escalation,
          priority,
          recommendation: signal.suggestedAction,
          whyItMatters: signal.reason,
          businessImpact: signal.businessImpact,
          businessImpactSummary: signal.businessImpact,
          status: 'approved',
          decidedAt: new Date(),
        },
      })
      await prisma.signal.updateMany({
        where: { id, userId },
        data: { isResolved: true, metadata: { status: 'approved' } },
      })
    }

    reply.code(204)
  })

  // POST /api/decisions/:id/defer — defer the decision
  fastify.post<{ Params: { id: string } }>('/:id/defer', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params

    const existing = await prisma.decision.findFirst({ where: { id, userId } })
    if (existing) {
      await prisma.decision.update({
        where: { id },
        data: { status: 'deferred', decidedAt: new Date() },
      })
      reply.code(204)
      return
    }

    // Fall back to Signal
    const snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.signal.updateMany({
      where: { id, userId },
      data: { snoozedUntil, metadata: { status: 'deferred' } },
    })
    reply.code(204)
  })

  // POST /api/decisions/:id/request-changes — flag that changes are needed
  fastify.post<{ Params: { id: string }; Body: unknown }>('/:id/request-changes', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params
    const { note } = RequestChangesBody.parse(req.body ?? {})

    const existing = await prisma.decision.findFirst({ where: { id, userId } })
    if (existing) {
      await prisma.decision.update({
        where: { id },
        data: { status: 'changes_requested', statusNote: note ?? null },
      })
      reply.code(204)
      return
    }

    // Fall back to Signal
    await prisma.signal.updateMany({
      where: { id, userId },
      data: {
        metadata: {
          status: 'changes_requested',
          ...(note ? { note } : {}),
        },
      },
    })
    reply.code(204)
  })
}
