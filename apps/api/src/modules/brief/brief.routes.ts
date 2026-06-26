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
        where: { userId, priority: { in: ['urgent', 'high'] }, isRead: false, isArchived: false },
        take: 8,
        orderBy: { receivedAt: 'desc' },
        select: {
          id: true, fromName: true, fromAddress: true, subject: true, summary: true,
          priority: true, priorityReason: true, messageCategory: true, receivedAt: true,
        },
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

    // Business Memory context: who are the senders of urgent messages?
    const tenantId = userId
    const senderAddresses = urgentMessages.map(m => m.fromAddress)
    const senderContext = senderAddresses.length > 0
      ? await prisma.person.findMany({
          where: { tenantId, email: { in: senderAddresses } },
          include: { organization: { select: { name: true } } },
          select: {
            name: true, email: true, role: true, company: true,
            organization: { select: { name: true } },
          },
        })
      : []

    // Recent decisions from Business Memory (last 5)
    const recentDecisions = await prisma.decision.findMany({
      where: { tenantId },
      take: 5,
      orderBy: { madeAt: 'desc' },
      select: { title: true, status: true, madeAt: true },
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
      // Business Memory enrichment
      senderContext,
      recentDecisions,
    }

    const briefText = await aiService.complete({
      messages: [
        {
          role: 'system',
          content: `You are a trusted Chief of Staff preparing the executive's morning brief.

Speak in first person as the assistant ("I've", "I'm tracking", "Everything is organized").
Never describe what you did. Describe what the executive needs to know.

Bad: "I analyzed 12 emails."
Good: "I've already gone through everything — only two conversations need you."

Bad: "I classified 5 messages as urgent."
Good: "There are two things that can't wait."

Bad: "I created 3 follow-up tasks."
Good: "I've delegated three follow-ups — nothing falls through."

Use the senderContext to personalize attention items — if you know who someone is (their role, organization), reference it naturally: "Rahul from ABC Corp" not just "a sender".

Use recentDecisions to avoid suggesting decisions that have already been made.

Return JSON with exactly these keys:
- greeting: string (warm, one sentence, personal, uses first name placeholder {name})
- situationSummary: array of 1-3 flowing prose sentences in first person — write as a trusted Chief of Staff narrating the morning to the executive. Sound human and calm, not like a bullet list. Each sentence should stand alone as a complete thought. Do NOT use lists or dashes. Examples: "I've already gone through everything — only two conversations need you today." / "Three follow-ups are moving; nothing is at risk of slipping." / "You have one decision to make before the day gets away from you."
- requiresAttention: array of {title: string, description: string, urgency: 'critical'|'high'|'normal', source: string}
- decisionsNeeded: array of {title: string, context: string, deadline?: string}
- commitmentsSummary: string (one sentence from the executive's perspective — what they've committed to)
- followUpsSummary: string (one sentence — what's in motion, not a count)
- waitingForSummary: string (one sentence — what's pending from others, without listing names)
- topPriority: string (single most important thing the executive should do right now, stated as an action)`,
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
        situationSummary: ["I've gone through everything. Here's what needs you today."],
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
