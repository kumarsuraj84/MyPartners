import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const actionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.suggestedAction.findMany({
      where: { userId, isDismissed: false, isActedOn: false },
      include: { message: { select: { subject: true, fromName: true, fromAddress: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  })

  fastify.patch('/:id/dismiss', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    return prisma.suggestedAction.update({ where: { id, userId }, data: { isDismissed: true } })
  })

  fastify.patch('/:id/act', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    return prisma.suggestedAction.update({ where: { id, userId }, data: { isActedOn: true } })
  })
}
