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
      data: { userId, type: 'email_processing', status: 'running', startedAt: new Date(), input: { messageId: id } },
    })

    try {
      const result = await aiService.complete({
        messages: [
          {
            role: 'system',
            content: `Analyze this message for an executive. Return JSON with:
- summary: string (2-3 sentence executive summary)
- actionItems: string[] (specific actions required)
- priority: 'urgent'|'high'|'normal'|'low'
- sentiment: 'positive'|'neutral'|'negative'
- suggestedActions: array of {label: string, type: 'reply'|'delegate'|'schedule'|'follow_up'|'archive'|'create_task', detail?: string}
- commitments: string[] (things the sender or executive committed to)
- followUps: string[] (items that need follow-up tracking)
- waitingFor: string[] (things now pending from someone, include who)`,
          },
          {
            role: 'user',
            content: `From: ${message.fromName ?? ''} <${message.fromAddress}>\nSubject: ${message.subject ?? ''}\n\n${message.body}`,
          },
        ],
        responseFormat: 'json',
        maxTokens: 1024,
      })

      let parsed: Record<string, unknown>
      try { parsed = JSON.parse(result) } catch { parsed = { summary: result } }

      // Update message
      await prisma.message.update({
        where: { id },
        data: {
          summary: parsed.summary as string,
          actionItems: parsed.actionItems as string[],
          priority: parsed.priority as string ?? message.priority,
          sentiment: parsed.sentiment as string,
          suggestedActions: parsed.suggestedActions as object[],
          aiProcessed: true,
        },
      })

      // Create suggested actions
      const suggestions = (parsed.suggestedActions as Array<{ label: string; type: string; detail?: string }> | undefined) ?? []
      if (suggestions.length > 0) {
        await prisma.suggestedAction.createMany({
          data: suggestions.map(s => ({ userId, messageId: id, label: s.label, type: s.type, detail: s.detail })),
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
          data: { userId, creatorId: userId, messageId: id, title: wf, category: 'waiting_for', priority: 'medium', waitingFrom: message.fromName ?? message.fromAddress },
        })
      }

      await prisma.aIJob.update({
        where: { id: job.id },
        data: { status: 'completed', completedAt: new Date(), output: parsed },
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
