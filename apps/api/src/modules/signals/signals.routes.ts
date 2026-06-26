import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { generateSignals } from '../../lib/signal-generator.js'

export const signalsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // Returns active signals, generating fresh ones first.
  // Respects snoozedUntil — snoozed signals are hidden until their snooze expires.
  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }

    // Run the generator on every fetch — it is idempotent
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
        // critical first, then high, then normal
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

  fastify.patch<{ Params: { id: string }; Body: { hours?: number } }>('/:id/snooze', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const hours = (req.body as { hours?: number })?.hours ?? 24
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000)
    await prisma.signal.updateMany({
      where: { id: req.params.id, userId },
      data: { snoozedUntil },
    })
    reply.code(204)
  })
}
