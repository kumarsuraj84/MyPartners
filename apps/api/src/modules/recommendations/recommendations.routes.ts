import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

const URGENCY_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }

function mapCategory(type: string): string {
  switch (type) {
    case 'overdue_commitment': return 'commitment'
    case 'unacknowledged_urgent': return 'message'
    case 'waiting_overdue': return 'waiting'
    default: return 'general'
  }
}

export const recommendationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (req) => {
    const { userId } = req.user as { userId: string }
    const now = new Date()

    const [signals, suggestedActions] = await Promise.all([
      prisma.signal.findMany({
        where: {
          userId,
          isDismissed: false,
          isResolved: false,
          urgency: { in: ['critical', 'high', 'normal'] },
          OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
        },
        orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      prisma.suggestedAction.findMany({
        where: {
          userId,
          isDismissed: false,
          isActedOn: false,
        },
        include: {
          message: {
            select: { fromName: true, fromAddress: true, subject: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    const mappedSignals = signals.map((s) => ({
      id: s.id,
      source: 'signal',
      category: mapCategory(s.type),
      title: s.title,
      reason: s.reason,
      action: s.suggestedAction,
      businessImpact: s.businessImpact,
      urgency: s.urgency,
      preparedBy: 'Chief of Staff',
    }))

    const mappedActions = suggestedActions.map((a) => ({
      id: a.id,
      source: 'action',
      category: a.type,
      title: a.label,
      reason: a.detail ?? '',
      action: a.label,
      businessImpact: '',
      urgency: 'normal',
      preparedBy: 'Communication Partner',
      messageSubject: a.message?.subject ?? null,
      messageFrom: a.message?.fromName ?? a.message?.fromAddress ?? null,
    }))

    const combined = [...mappedSignals, ...mappedActions]
    combined.sort((a, b) => {
      const aOrder = URGENCY_ORDER[a.urgency] ?? 99
      const bOrder = URGENCY_ORDER[b.urgency] ?? 99
      return aOrder - bOrder
    })

    return combined
  })
}
