import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { can } from '../../lib/permissions.js'

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (!can(user.role, 'viewAuditLog')) return reply.code(403).send({ error: 'Forbidden' })

    const { entity, limit = '50', cursor } = req.query as {
      entity?: string
      limit?: string
      cursor?: string
    }

    const take = Math.min(parseInt(limit, 10) || 50, 200)

    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: userId,
        ...(entity ? { entity } : {}),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    })

    return {
      logs,
      nextCursor: logs.length === take ? logs[logs.length - 1].createdAt.toISOString() : null,
    }
  })
}
