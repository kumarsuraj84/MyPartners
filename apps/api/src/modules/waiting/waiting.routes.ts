import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const waitingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        category: 'waiting_for',
        status: { notIn: ['completed', 'cancelled'] },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: 50,
    })

    const now = new Date()

    const results = await Promise.all(
      tasks.map(async (task) => {
        let person = null
        if (task.waitingFrom) {
          person = await prisma.person.findFirst({
            where: {
              tenantId: userId,
              name: { contains: task.waitingFrom, mode: 'insensitive' },
            },
          })
        }

        return {
          id: task.id,
          title: task.title,
          waitingFrom: task.waitingFrom ?? 'Unknown',
          daysWaiting: Math.floor((Date.now() - task.createdAt.getTime()) / 86400000),
          dueDate: task.dueDate?.toISOString() ?? null,
          isOverdue: task.dueDate ? task.dueDate < now : false,
          priority: task.priority,
          context: task.description ?? null,
          personId: person?.id ?? null,
          personRole: person?.role ?? null,
          personCompany: person?.company ?? null,
        }
      }),
    )

    return results
  })
}
