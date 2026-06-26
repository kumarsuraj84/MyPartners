import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { aiService } from '../../lib/ai.js'

export const briefRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/today', async (req) => {
    const { userId } = req.user as { userId: string }
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Return cached brief if exists
    const existing = await prisma.executiveBrief.findFirst({ where: { userId, date: today } })
    if (existing) return existing

    // Generate new brief
    return generateBrief(fastify, userId, today)
  })

  fastify.post('/generate', async (req) => {
    const { userId } = req.user as { userId: string }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return generateBrief(fastify, userId, today)
  })
}

async function generateBrief(fastify: ReturnType<typeof import('fastify').default>, userId: string, today: Date) {
  const [urgentMessages, pendingTasks, recentMessages] = await Promise.all([
    prisma.message.findMany({ where: { userId, priority: 'urgent', isRead: false }, take: 5, orderBy: { receivedAt: 'desc' } }),
    prisma.task.findMany({ where: { userId, status: { in: ['pending', 'in_progress'] } }, take: 10, orderBy: { dueDate: 'asc' } }),
    prisma.message.findMany({ where: { userId, isArchived: false }, take: 10, orderBy: { receivedAt: 'desc' } }),
  ])

  const context = JSON.stringify({ urgentMessages, pendingTasks, recentMessages }, null, 2)

  const briefText = await aiService.complete({
    messages: [
      {
        role: 'system',
        content: `You are an executive assistant preparing a morning brief. Return JSON with these keys:
          greeting (string),
          priorityCount (number),
          highlights (array of {title, description, type: 'urgent'|'task'|'info'}),
          decisionsNeeded (array of strings),
          topTasks (array of {title, priority, dueDate}),
          summary (string paragraph)`,
      },
      { role: 'user', content: `Today is ${new Date().toDateString()}. Here's the executive's current context:\n${context}` },
    ],
    responseFormat: 'json',
    maxTokens: 2048,
  })

  let content: Record<string, unknown>
  try { content = JSON.parse(briefText) } catch { content = { summary: briefText, highlights: [] } }

  return prisma.executiveBrief.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, content },
    update: { content },
  })
}
