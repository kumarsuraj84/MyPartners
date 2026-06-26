import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { aiService } from '../../lib/ai.js'

export const briefRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/today', async (req) => {
    const { userId } = req.user as { userId: string }
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await prisma.executiveBrief.findFirst({ where: { userId, date: today } })
    if (existing) return existing

    return generateBrief(userId)
  })

  fastify.post('/generate', async (req) => {
    const { userId } = req.user as { userId: string }
    return generateBrief(userId)
  })

  async function generateBrief(userId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [urgentMessages, unreadMessages, pendingTasks, commitments, followUps, waitingFor, suggestedActions] = await Promise.all([
      prisma.message.findMany({
        where: { userId, priority: 'urgent', isRead: false, isArchived: false },
        take: 5,
        orderBy: { receivedAt: 'desc' },
        select: { id: true, fromName: true, fromAddress: true, subject: true, summary: true, priority: true, receivedAt: true },
      }),
      prisma.message.count({ where: { userId, isRead: false, isArchived: false } }),
      prisma.task.findMany({
        where: { userId, category: 'task', status: { in: ['pending', 'in_progress'] } },
        take: 8,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        select: { id: true, title: true, priority: true, dueDate: true, status: true },
      }),
      prisma.task.findMany({
        where: { userId, category: 'commitment', status: { not: 'completed' } },
        take: 5,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        select: { id: true, title: true, dueDate: true, assigneeName: true },
      }),
      prisma.task.findMany({
        where: { userId, category: 'follow_up', status: { not: 'completed' } },
        take: 5,
        orderBy: { dueDate: 'asc' },
        select: { id: true, title: true, dueDate: true },
      }),
      prisma.task.findMany({
        where: { userId, category: 'waiting_for', status: { not: 'completed' } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, waitingFrom: true, createdAt: true },
      }),
      prisma.suggestedAction.count({ where: { userId, isDismissed: false, isActedOn: false } }),
    ])

    const overdueCount = await prisma.task.count({
      where: { userId, status: { not: 'completed' }, dueDate: { lt: new Date() } },
    })

    const context = {
      date: new Date().toDateString(),
      unreadMessages,
      urgentMessages,
      pendingTasks,
      commitments,
      followUps,
      waitingFor,
      suggestedActionsCount: suggestedActions,
      overdueCount,
    }

    const briefText = await aiService.complete({
      messages: [
        {
          role: 'system',
          content: `You are an elite executive assistant preparing a morning brief for a busy executive.
Be direct, concise, and action-oriented. Surface only what matters.
Return JSON with exactly these keys:
- greeting: string (warm, one sentence, includes first name placeholder {name})
- handledByAI: array of strings (what the AI already processed or organized — be specific, e.g. "Summarized 12 emails", "Flagged 3 urgent items from Alex")
- requiresAttention: array of {title: string, description: string, urgency: 'critical'|'high'|'normal', source: string}
- decisionsNeeded: array of {title: string, context: string, deadline?: string}
- commitmentsSummary: string (one sentence covering pending commitments)
- followUpsSummary: string (one sentence on what's being tracked)
- waitingForSummary: string (one sentence on what's pending from others)
- topPriority: string (single most important thing the executive should do right now)`,
        },
        {
          role: 'user',
          content: JSON.stringify(context, null, 2),
        },
      ],
      responseFormat: 'json',
      maxTokens: 2048,
    })

    let content: Record<string, unknown>
    try {
      content = JSON.parse(briefText)
    } catch {
      content = {
        greeting: 'Good morning.',
        handledByAI: [],
        requiresAttention: [],
        decisionsNeeded: [],
        commitmentsSummary: '',
        followUpsSummary: '',
        waitingForSummary: '',
        topPriority: '',
      }
    }

    // Attach live counts so frontend doesn't need extra queries
    content._meta = {
      unreadMessages,
      urgentCount: urgentMessages.length,
      commitmentsCount: commitments.length,
      followUpsCount: followUps.length,
      waitingForCount: waitingFor.length,
      overdueCount,
      suggestedActionsCount: suggestedActions,
    }

    return prisma.executiveBrief.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, content },
      update: { content },
    })
  }
}
