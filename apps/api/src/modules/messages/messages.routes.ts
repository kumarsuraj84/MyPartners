import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { aiService } from '../../lib/ai.js'

const QuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  priority: z.string().optional(),
  provider: z.string().optional(),
  unread: z.coerce.boolean().optional(),
  search: z.string().optional(),
})

export const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }
    const query = QuerySchema.parse(req.query)
    const { page, limit, priority, provider, unread, search } = query
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { userId }
    if (priority) where.priority = priority
    if (provider) where.provider = provider
    if (unread !== undefined) where.isRead = !unread
    if (search) where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { fromName: { contains: search, mode: 'insensitive' } },
      { fromAddress: { contains: search, mode: 'insensitive' } },
      { summary: { contains: search, mode: 'insensitive' } },
    ]

    const [messages, total] = await Promise.all([
      prisma.message.findMany({ where, orderBy: { receivedAt: 'desc' }, skip, take: limit }),
      prisma.message.count({ where }),
    ])

    return { messages, total, page, limit, pages: Math.ceil(total / limit) }
  })

  fastify.get('/:id', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    return prisma.message.findFirstOrThrow({ where: { id, userId } })
  })

  fastify.patch('/:id/read', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    return prisma.message.update({ where: { id, userId }, data: { isRead: true } })
  })

  fastify.patch('/:id/archive', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    return prisma.message.update({ where: { id, userId }, data: { isArchived: true } })
  })

  fastify.post('/:id/summarize', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    const message = await prisma.message.findFirstOrThrow({ where: { id, userId } })

    const summary = await aiService.complete({
      messages: [
        { role: 'system', content: 'You are an executive assistant. Summarize this email concisely in 2-3 sentences. Extract any action items as a JSON array under "actionItems". Return JSON with keys: summary (string), actionItems (array of strings), priority (urgent|high|normal|low), sentiment (positive|neutral|negative).' },
        { role: 'user', content: `Subject: ${message.subject}\nFrom: ${message.fromName} <${message.fromAddress}>\n\n${message.body}` },
      ],
      responseFormat: 'json',
    })

    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(summary) } catch { parsed = { summary, actionItems: [] } }

    return prisma.message.update({
      where: { id },
      data: {
        summary: parsed.summary as string,
        actionItems: parsed.actionItems as string[],
        priority: (parsed.priority as string) ?? message.priority,
        sentiment: parsed.sentiment as string,
        aiProcessed: true,
      },
    })
  })

  fastify.get('/stats/overview', async (req) => {
    const { userId } = req.user as { userId: string }
    const [total, unread, urgent, high] = await Promise.all([
      prisma.message.count({ where: { userId, isArchived: false } }),
      prisma.message.count({ where: { userId, isRead: false, isArchived: false } }),
      prisma.message.count({ where: { userId, priority: 'urgent', isArchived: false } }),
      prisma.message.count({ where: { userId, priority: 'high', isArchived: false } }),
    ])
    return { total, unread, urgent, high }
  })
}
