import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

const CATEGORIES = ['task', 'commitment', 'follow_up', 'waiting_for'] as const
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const
const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(PRIORITIES).default('medium'),
  category: z.enum(CATEGORIES).default('task'),
  dueDate: z.string().datetime().optional(),
  assigneeName: z.string().optional(),
  waitingFrom: z.string().optional(),
  messageId: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(STATUSES).optional(),
})

export const tasksRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }
    const { status, priority, category } = req.query as Record<string, string>

    const where: Record<string, unknown> = { userId }
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean)
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses }
    }
    if (priority) where.priority = priority
    if (category) {
      const categories = category.split(',').map(s => s.trim()).filter(Boolean)
      where.category = categories.length === 1 ? categories[0] : { in: categories }
    }

    return prisma.task.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    })
  })

  fastify.post('/', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const data = CreateTaskSchema.parse(req.body)
    const task = await prisma.task.create({
      data: {
        ...data,
        userId,
        creatorId: userId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
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
    const [pending, in_progress, completed, overdue, commitments, follow_ups, waiting_for] = await Promise.all([
      prisma.task.count({ where: { userId, status: 'pending', category: 'task' } }),
      prisma.task.count({ where: { userId, status: 'in_progress' } }),
      prisma.task.count({ where: { userId, status: 'completed' } }),
      prisma.task.count({ where: { userId, status: { not: 'completed' }, dueDate: { lt: new Date() } } }),
      prisma.task.count({ where: { userId, category: 'commitment', status: { not: 'completed' } } }),
      prisma.task.count({ where: { userId, category: 'follow_up', status: { not: 'completed' } } }),
      prisma.task.count({ where: { userId, category: 'waiting_for', status: { not: 'completed' } } }),
    ])
    return { pending, in_progress, completed, overdue, commitments, follow_ups, waiting_for }
  })

  // Convenience: get by category
  fastify.get('/commitments', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.task.findMany({
      where: { userId, category: 'commitment', status: { not: 'completed' } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    })
  })

  fastify.get('/follow-ups', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.task.findMany({
      where: { userId, category: 'follow_up', status: { not: 'completed' } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    })
  })

  fastify.get('/waiting-for', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.task.findMany({
      where: { userId, category: 'waiting_for', status: { not: 'completed' } },
      orderBy: [{ createdAt: 'desc' }],
    })
  })
}
