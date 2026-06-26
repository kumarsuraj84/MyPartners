import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { generateSignals } from '../../lib/signal-generator.js'

const SnoozeBody = z.object({ hours: z.number().int().min(1).max(168).default(24) })

export const signalsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // Returns active signals, generating fresh ones first.
  // Respects snoozedUntil — snoozed signals are hidden until their snooze expires.
  // Signal generation is throttled to once per 5 minutes per user.
  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }

    await generateSignals(userId)

    const now = new Date()
    return prisma.signal.findMany({
      where: {
        userId,
        isDismissed: false,
        isResolved: false,
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
      },
      orderBy: [
        { urgency: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    })
  })

  fastify.patch<{ Params: { id: string } }>('/:id/dismiss', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    await prisma.signal.updateMany({
      where: { id: req.params.id, userId },
      data: { isDismissed: true },
    })
    reply.code(204)
  })

  fastify.patch<{ Params: { id: string }; Body: unknown }>('/:id/snooze', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { hours } = SnoozeBody.parse(req.body ?? {})
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000)
    await prisma.signal.updateMany({
      where: { id: req.params.id, userId },
      data: { snoozedUntil },
    })
    reply.code(204)
  })
}
