import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { aiService } from '../../lib/ai.js'

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/jobs', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.aIJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 })
  })

  fastify.get('/activity', async (req) => {
    const { userId } = req.user as { userId: string }

    const [jobs, needsAttention, totalUnread, activeFollowUps, activeCommitments, waitingFor, queueDepth] = await Promise.all([
      prisma.aIJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, type: true, status: true, createdAt: true,
          completedAt: true, error: true, startedAt: true,
          input: true, output: true,
        },
      }),
      prisma.message.count({ where: { userId, isRead: false, isArchived: false, priority: { in: ['urgent', 'high'] } } }),
      prisma.message.count({ where: { userId, isRead: false, isArchived: false } }),
      prisma.task.count({ where: { userId, category: 'follow_up', status: { not: 'completed' } } }),
      prisma.task.count({ where: { userId, category: 'commitment', status: { not: 'completed' } } }),
      prisma.task.count({ where: { userId, category: 'waiting_for', status: { not: 'completed' } } }),
      prisma.message.count({ where: { userId, aiProcessed: false, isArchived: false } }),
    ])

    const recentJobs = jobs.slice(0, 20)
    const lastSuccess = recentJobs.find(j => j.status === 'completed')
    const errorCount = recentJobs.filter(j => j.status === 'failed').length
    const errorRate = recentJobs.length > 0 ? Math.round((errorCount / recentJobs.length) * 100) : 0

    return {
      jobs,
      status: {
        needsAttention,
        totalUnread,
        activeFollowUps,
        activeCommitments,
        waitingFor,
        activeJobs: jobs.filter(j => j.status === 'running').length,
        lastActivity: jobs[0]?.createdAt ?? null,
      },
      health: {
        queue: queueDepth,
        lastSuccess: lastSuccess?.completedAt ?? null,
        errorRate,
        groqConfigured: !!process.env.GROQ_API_KEY,
      },
    }
  })

  fastify.post('/process-message/:id', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    const message = await prisma.message.findFirstOrThrow({ where: { id, userId } })

    const job = await prisma.aIJob.create({
      data: {
        userId,
        type: 'email_processing',
        status: 'running',
        startedAt: new Date(),
        input: { messageId: id },
      },
    })

    // Update job stage for Mission Control visibility
    const setStage = (stage: string) =>
      prisma.aIJob.update({ where: { id: job.id }, data: { metadata: { stage } } })

    try {
      await setStage('understanding')

      const result = await aiService.complete({
        messages: [
          {
            role: 'system',
            content: `You are a Chief of Staff processing business communication through an intelligence pipeline.

PIPELINE STAGES — follow each in order, thinking step by step before returning JSON:

UNDERSTAND: What is this message really about? What is the business context? Who is the sender and what is their likely relationship to the executive?

CLASSIFY: What type of communication is this? Choose one: request, update, fyi, decision, commitment, introduction. What makes it worth the executive's attention — or not?

EXTRACT: Pull out every concrete item:
- Action items the executive must do
- Commitments made by the sender OR the executive
- Follow-ups that need tracking
- Items the executive is now waiting for from someone
- Named entities: people, companies, projects, amounts, deadlines

RELATE: Does this connect to ongoing work? Is this a reply? Is there an implicit deadline or urgency not stated directly?

PRIORITIZE: Assign priority (urgent|high|normal|low) and explain specifically WHY in one sentence. Urgent = requires action today. High = requires action this week. Be conservative — most messages are normal.

RECOMMEND: Suggest 2-4 specific actions. Labels should sound like executive decisions ("Reply and approve", "Delegate to team", "Schedule call", "No action needed"), not software buttons.

REMEMBER: Identify 0-2 pieces of information worth storing permanently as business context (key decisions, vendor details, project context, new contacts). Only include genuinely important context, not routine information.

Return exactly this JSON structure:
{
  "summary": "2-3 sentence executive summary of what happened and what it means",
  "whyItMatters": "1 sentence — why this matters to the executive specifically",
  "messageCategory": "request|update|fyi|decision|commitment|introduction",
  "priority": "urgent|high|normal|low",
  "priorityReason": "specific reason for this priority level",
  "sentiment": "positive|neutral|negative",
  "actionItems": ["string"],
  "commitments": ["string"],
  "followUps": ["string"],
  "waitingFor": ["string — include who"],
  "suggestedActions": [{"label": "string", "type": "reply|delegate|schedule|follow_up|archive|create_task", "detail": "string"}],
  "entities": [{"name": "string", "type": "person|company|project|amount|date", "context": "string"}],
  "memoryItems": [{"title": "string", "type": "note|decision|vendor|project|contact", "content": "string"}]
}`,
          },
          {
            role: 'user',
            content: `From: ${message.fromName ?? ''} <${message.fromAddress}>\nSubject: ${message.subject ?? ''}\n\n${message.body}`,
          },
        ],
        responseFormat: 'json',
        maxTokens: 1500,
      })

      let parsed: Record<string, unknown>
      try { parsed = JSON.parse(result) } catch { parsed = { summary: result } }

      await setStage('extracting')

      // Update message with enriched intelligence
      await prisma.message.update({
        where: { id },
        data: {
          summary: parsed.summary as string,
          actionItems: parsed.actionItems as string[],
          priority: (parsed.priority as string) ?? message.priority,
          priorityReason: parsed.priorityReason as string,
          messageCategory: parsed.messageCategory as string,
          sentiment: parsed.sentiment as string,
          aiProcessed: true,
          metadata: {
            whyItMatters: parsed.whyItMatters,
            entities: parsed.entities ?? [],
          },
        },
      })

      await setStage('recording')

      // Create suggested actions
      const suggestions = (parsed.suggestedActions as Array<{ label: string; type: string; detail?: string }> | undefined) ?? []
      if (suggestions.length > 0) {
        await prisma.suggestedAction.createMany({
          data: suggestions.map(s => ({
            userId, messageId: id, label: s.label, type: s.type, detail: s.detail,
          })),
        })
      }

      // Create follow-up tasks
      const followUps = (parsed.followUps as string[] | undefined) ?? []
      for (const fu of followUps) {
        await prisma.task.create({
          data: { userId, creatorId: userId, messageId: id, title: fu, category: 'follow_up', priority: 'medium' },
        })
      }

      // Create waiting-for tasks
      const waitingFor = (parsed.waitingFor as string[] | undefined) ?? []
      for (const wf of waitingFor) {
        await prisma.task.create({
          data: {
            userId, creatorId: userId, messageId: id, title: wf,
            category: 'waiting_for', priority: 'medium',
            waitingFrom: message.fromName ?? message.fromAddress,
          },
        })
      }

      await setStage('remembering')

      // Auto-remember: store important context in Memory
      const memoryItems = (parsed.memoryItems as Array<{ title: string; type: string; content: string }> | undefined) ?? []
      for (const item of memoryItems) {
        await prisma.knowledgeNote.create({
          data: {
            userId,
            title: item.title,
            type: item.type,
            content: item.content,
            tags: [message.fromName ?? message.fromAddress, ...(message.subject ? [message.subject] : [])].filter(Boolean),
          },
        })
      }

      await prisma.aIJob.update({
        where: { id: job.id },
        data: { status: 'completed', completedAt: new Date(), output: parsed, metadata: { stage: 'complete' } },
      })

      return { success: true, result: parsed }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      await prisma.aIJob.update({
        where: { id: job.id },
        data: { status: 'failed', completedAt: new Date(), error: errMsg },
      })
      throw error
    }
  })
}
