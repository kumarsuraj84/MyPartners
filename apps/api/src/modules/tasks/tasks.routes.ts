import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
  dueDate: z.string().datetime().optional(),
  assigneeName: z.string().optional(),
  messageId: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
})

export const tasksRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }
    const { status, priority } = req.query as { status?: string; priority?: string }

    const where: Record<string, unknown> = { userId }
    if (status) where.status = status
    if (priority) where.priority = priority

    return prisma.task.findMany({ where, orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }] })
  })

  fastify.post('/', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const data = CreateTaskSchema.parse(req.body)
    const task = await prisma.task.create({
      data: { ...data, userId, creatorId: userId, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    })
    reply.code(201)
    return task
  })

  fastify.patch('/:id', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    const data = UpdateTaskSchema.parse(req.body)
    return prisma.task.update({
      where: { id, userId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        completedAt: data.status === 'completed' ? new Date() : undefined,
      },
    })
  })

  fastify.delete('/:id', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    await prisma.task.delete({ where: { id, userId } })
    reply.code(204)
  })

  fastify.get('/stats', async (req) => {
    const { userId } = req.user as { userId: string }
    const [pending, in_progress, completed, overdue] = await Promise.all([
      prisma.task.count({ where: { userId, status: 'pending' } }),
      prisma.task.count({ where: { userId, status: 'in_progress' } }),
      prisma.task.count({ where: { userId, status: 'completed' } }),
      prisma.task.count({ where: { userId, status: { not: 'completed' }, dueDate: { lt: new Date() } } }),
    ])
    return { pending, in_progress, completed, overdue }
  })
}
