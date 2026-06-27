import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { aiService } from '../../lib/ai.js'
import { getCategoryConfig } from '../../lib/config.js'
import { generateSignals } from '../../lib/signal-generator.js'

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

    const briefConfig = await getCategoryConfig<{
      urgentMessagesLimit: number
      decisionsLimit: number
      commitmentsLimit: number
      followUpsLimit: number
      waitingForLimit: number
      recentDecisionsLimit: number
    }>(userId, 'brief')

    const assistantConfig = await getCategoryConfig<{ maxTokensBrief: number }>(userId, 'assistant')

    const [urgentMessages, unreadMessages, pendingTasks, commitments, followUps, waitingFor, suggestedActions] = await Promise.all([
      prisma.message.findMany({
        where: { userId, priority: { in: ['urgent', 'high'] }, isRead: false, isArchived: false },
        take: briefConfig.urgentMessagesLimit ?? 8,
        orderBy: { receivedAt: 'desc' },
        select: {
          id: true, fromName: true, fromAddress: true, subject: true, summary: true,
          priority: true, priorityReason: true, messageCategory: true, receivedAt: true,
        },
      }),
      prisma.message.count({ where: { userId, isRead: false, isArchived: false } }),
      prisma.task.findMany({
        where: { userId, category: 'task', status: { in: ['pending', 'in_progress'] } },
        take: briefConfig.urgentMessagesLimit ?? 8,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        select: { id: true, title: true, priority: true, dueDate: true, status: true },
      }),
      prisma.task.findMany({
        where: { userId, category: 'commitment', status: { not: 'completed' } },
        take: briefConfig.commitmentsLimit ?? 5,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        select: { id: true, title: true, dueDate: true, assigneeName: true },
      }),
      prisma.task.findMany({
        where: { userId, category: 'follow_up', status: { not: 'completed' } },
        take: briefConfig.followUpsLimit ?? 5,
        orderBy: { dueDate: 'asc' },
        select: { id: true, title: true, dueDate: true },
      }),
      prisma.task.findMany({
        where: { userId, category: 'waiting_for', status: { not: 'completed' } },
        take: briefConfig.waitingForLimit ?? 5,
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
          select: {
            name: true, email: true, role: true, company: true,
            organization: { select: { name: true } },
          },
        })
      : []

    // Recent decisions from Business Memory
    const recentDecisions = await prisma.decision.findMany({
      where: { tenantId },
      take: briefConfig.recentDecisionsLimit ?? 5,
      orderBy: { madeAt: 'desc' },
      select: { title: true, status: true, madeAt: true },
    })

    // Generate fresh signals and include active ones in context
    await generateSignals(userId)
    const activeSignals = await prisma.signal.findMany({
      where: { userId, isDismissed: false, isResolved: false, snoozedUntil: null },
      orderBy: { urgency: 'asc' },
      take: 5,
      select: { type: true, title: true, businessImpact: true, suggestedAction: true, urgency: true },
    })

    // Delta: what changed since yesterday's brief
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const [newMessagesSinceYesterday, completedSinceYesterday, newlyOverdueSinceYesterday] = await Promise.all([
      prisma.message.count({
        where: { userId, receivedAt: { gte: yesterday }, isArchived: false },
      }),
      prisma.task.count({
        where: { userId, status: 'completed', completedAt: { gte: yesterday } },
      }),
      prisma.task.count({
        where: { userId, status: { not: 'completed' }, dueDate: { gte: yesterday, lt: today } },
      }),
    ])

    const delta = {
      newMessages: newMessagesSinceYesterday,
      completedTasks: completedSinceYesterday,
      newlyOverdue: newlyOverdueSinceYesterday,
      activeSignals: activeSignals.length,
    }

    const context = {
      date: new Date().toDateString(),
      unreadMessages,
      urgentMessages: urgentMessages.map(m => ({
        id: m.id, fromName: m.fromName, fromAddress: m.fromAddress,
        subject: m.subject, summary: m.summary, priority: m.priority,
        priorityReason: m.priorityReason, messageCategory: m.messageCategory, receivedAt: m.receivedAt,
      })),
      pendingTasks,
      commitments,
      followUps,
      waitingFor,
      suggestedActionsCount: suggestedActions,
      overdueCount,
      // Business Memory enrichment
      senderContext,
      recentDecisions,
      // Proactive signals
      activeSignals,
      // Change delta since yesterday
      delta,
    }

    const fallbackContent: Record<string, unknown> = {
      greeting: 'Good morning, {name}.',
      situationSummary: unreadMessages > 0
        ? [`I've reviewed everything. You have ${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}${urgentMessages.length > 0 ? `, ${urgentMessages.length} of which need your attention` : ''}.`]
        : ["I've gone through everything. You're all caught up."],
      requiresAttention: urgentMessages.slice(0, 3).map(m => ({
        title: m.subject ?? `Message from ${m.fromName ?? m.fromAddress}`,
        description: m.summary ?? m.priorityReason ?? 'Marked as urgent.',
        urgency: m.priority === 'urgent' ? 'critical' : 'high',
        source: m.fromName ?? m.fromAddress,
      })),
      decisionsNeeded: [],
      newRisks: [],
      resolvedItems: [],
      commitmentsSummary: commitments.length > 0 ? `You have ${commitments.length} open commitment${commitments.length === 1 ? '' : 's'}.` : '',
      followUpsSummary: followUps.length > 0 ? `${followUps.length} follow-up${followUps.length === 1 ? ' is' : 's are'} in motion.` : '',
      waitingForSummary: waitingFor.length > 0 ? `Waiting on ${waitingFor.length} item${waitingFor.length === 1 ? '' : 's'}.` : '',
      topPriority: urgentMessages.length > 0
        ? `Review and respond to urgent message from ${urgentMessages[0].fromName ?? urgentMessages[0].fromAddress}`
        : overdueCount > 0 ? 'Address overdue items on your task list' : '',
    }

    let content: Record<string, unknown> = fallbackContent

    try {
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

Use activeSignals to surface proactive observations — overdue commitments, long-unanswered waiting items. Reference them naturally as part of the narrative, not as a list.

Use delta to describe what changed since yesterday: new messages, completed work, newly overdue items. The executive should understand movement, not just current state.

Return JSON with exactly these keys:
- greeting: string (warm, one sentence, personal, uses first name placeholder {name})
- situationSummary: array of 1-3 flowing prose sentences in first person — write as a trusted Chief of Staff narrating the morning to the executive. Sound human and calm, not like a bullet list. Each sentence should stand alone as a complete thought. Incorporate what changed since yesterday if meaningful. Do NOT use lists or dashes.
- requiresAttention: array of {title: string, description: string, urgency: 'critical'|'high'|'normal', source: string}
- decisionsNeeded: array of {title: string, context: string, deadline?: string}
- newRisks: array of string — new risks that appeared since yesterday (from signals or new messages). Empty array if none.
- resolvedItems: array of string — items that were pending yesterday but are now resolved. Empty array if none.
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
        maxTokens: assistantConfig.maxTokensBrief ?? 2048,
      })

      const parsed = JSON.parse(briefText)
      if (parsed && typeof parsed === 'object') content = parsed
    } catch {
      // AI unavailable or parse failed — fallback content already set above
    }

    // Ensure new fields exist even when the AI omits them
    if (!Array.isArray(content.newRisks)) content.newRisks = []
    if (!Array.isArray(content.resolvedItems)) content.resolvedItems = []

    // Attach live counts so frontend doesn't need extra queries
    content._meta = {
      unreadMessages,
      urgentCount: urgentMessages.length,
      commitmentsCount: commitments.length,
      followUpsCount: followUps.length,
      waitingForCount: waitingFor.length,
      overdueCount,
      suggestedActionsCount: suggestedActions,
      signalsCount: activeSignals.length,
      delta,
    }

    return prisma.executiveBrief.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, content: content as Record<string, unknown> },
      update: { content: content as Record<string, unknown> },
    })
  }
}
