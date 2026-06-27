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
    preparedBy: 'system',
    preparedAt: signal.createdAt.toISOString(),
    estimatedTime: null as string | null,
    context: null as string | null,
  }
}

const RequestChangesBody = z.object({
  note: z.string().optional(),
})

export const decisionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /api/decisions — list pending decision candidates derived from active signals
  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }

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

  // POST /api/decisions/:id/approve — mark a decision approved (resolves the signal)
  fastify.post<{ Params: { id: string } }>('/:id/approve', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    await prisma.signal.updateMany({
      where: { id: req.params.id, userId },
      data: { isResolved: true, metadata: { status: 'approved' } },
    })
    reply.code(204)
  })

  // POST /api/decisions/:id/defer — snooze / defer the decision (24h by default)
  fastify.post<{ Params: { id: string } }>('/:id/defer', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.signal.updateMany({
      where: { id: req.params.id, userId },
      data: { snoozedUntil, metadata: { status: 'deferred' } },
    })
    reply.code(204)
  })

  // POST /api/decisions/:id/request-changes — flag that changes are needed, with optional note
  fastify.post<{ Params: { id: string }; Body: unknown }>('/:id/request-changes', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { note } = RequestChangesBody.parse(req.body ?? {})
    await prisma.signal.updateMany({
      where: { id: req.params.id, userId },
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
