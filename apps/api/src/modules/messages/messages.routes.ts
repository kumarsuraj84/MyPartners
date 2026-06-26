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

// Include pending suggested actions inline with every message
const WITH_SUGGESTIONS = {
  suggestedActions: {
    where: { isDismissed: false, isActedOn: false },
    orderBy: { createdAt: 'asc' as const },
  },
}

export const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }
    const query = QuerySchema.parse(req.query)
    const { page, limit, priority, provider, unread, search } = query
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { userId, isArchived: false }
    if (priority) where.priority = priority
    if (provider) where.provider = provider
    if (unread !== undefined) where.isRead = !unread
    if (search) where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { fromName: { contains: search, mode: 'insensitive' } },
      { fromAddress: { contains: search, mode: 'insensitive' } },
      { summary: { contains: search, mode: 'insensitive' } },
      { body: { contains: search, mode: 'insensitive' } },
    ]

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
        include: WITH_SUGGESTIONS,
      }),
      prisma.message.count({ where }),
    ])

    return { messages, total, page, limit, pages: Math.ceil(total / limit) }
  })

  fastify.get('/:id', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    return prisma.message.findFirstOrThrow({ where: { id, userId }, include: WITH_SUGGESTIONS })
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

  // Quick review — same full pipeline, called from "Review now" button
  fastify.post('/:id/summarize', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    const message = await prisma.message.findFirstOrThrow({ where: { id, userId } })

    const result = await aiService.complete({
      messages: [
        {
          role: 'system',
          content: `You are a Chief of Staff reviewing business communication.

Analyze this message and return exactly this JSON:
{
  "summary": "2-3 sentence executive summary",
  "whyItMatters": "1 sentence — why this matters to the executive",
  "messageCategory": "request|update|fyi|decision|commitment|introduction",
  "priority": "urgent|high|normal|low",
  "priorityReason": "specific reason for this priority level",
  "sentiment": "positive|neutral|negative",
  "actionItems": ["string"],
  "suggestedActions": [{"label": "string", "type": "reply|delegate|schedule|follow_up|archive|create_task", "detail": "string"}]
}

Action labels should sound like executive decisions, not software buttons.
Be conservative with priority — most messages are normal.`,
        },
        {
          role: 'user',
          content: `From: ${message.fromName ?? ''} <${message.fromAddress}>\nSubject: ${message.subject ?? ''}\n\n${message.body.slice(0, 4000)}`,
        },
      ],
      responseFormat: 'json',
      maxTokens: 800,
    })

    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(result) } catch { parsed = { summary: result, actionItems: [] } }

    const updated = await prisma.message.update({
      where: { id },
      data: {
        summary: parsed.summary as string,
        actionItems: parsed.actionItems as string[],
        priority: (parsed.priority as string) ?? message.priority,
        priorityReason: parsed.priorityReason as string,
        messageCategory: parsed.messageCategory as string,
        sentiment: parsed.sentiment as string,
        aiProcessed: true,
        metadata: { whyItMatters: parsed.whyItMatters },
      },
      include: WITH_SUGGESTIONS,
    })

    // Create suggested actions (remove stale ones first)
    await prisma.suggestedAction.deleteMany({ where: { messageId: id, isDismissed: false, isActedOn: false } })
    const suggestions = (parsed.suggestedActions as Array<{ label: string; type: string; detail?: string }> | undefined) ?? []
    if (suggestions.length > 0) {
      await prisma.suggestedAction.createMany({
        data: suggestions.map(s => ({ userId, messageId: id, label: s.label, type: s.type, detail: s.detail })),
      })
    }

    return prisma.message.findFirstOrThrow({ where: { id }, include: WITH_SUGGESTIONS })
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
