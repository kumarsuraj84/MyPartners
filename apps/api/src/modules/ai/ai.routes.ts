import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { aiService } from '../../lib/ai.js'
import { resolveEntities } from '../../lib/entity-resolver.js'

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/jobs', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.aIJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 })
  })

  fastify.get('/activity', async (req) => {
    const { userId } = req.user as { userId: string }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [jobs, needsAttention, totalUnread, activeFollowUps, activeCommitments, waitingFor, queueDepth, criticalSignals, recentNotes] = await Promise.all([
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
      prisma.signal.findMany({
        where: { userId, urgency: { in: ['critical', 'high'] }, isDismissed: false, isResolved: false },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, suggestedAction: true, urgency: true },
      }),
      prisma.knowledgeNote.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, type: true, title: true, createdAt: true },
      }),
    ])

    const recentJobs = jobs.slice(0, 20)
    const lastSuccess = recentJobs.find(j => j.status === 'completed')
    const errorCount = recentJobs.filter(j => j.status === 'failed').length
    const errorRate = recentJobs.length > 0 ? Math.round((errorCount / recentJobs.length) * 100) : 0
    const completedCount = recentJobs.filter(j => j.status === 'completed').length

    // Build whatHappened narrative
    const whatHappened: string[] = [
      `Your office reviewed ${totalUnread + completedCount} item${totalUnread + completedCount === 1 ? '' : 's'} since last night, handled ${completedCount} without any input needed from you, and surfaced ${needsAttention} that require${needsAttention === 1 ? 's' : ''} your decision or approval.`,
      `${totalUnread} unread message${totalUnread === 1 ? ' has' : 's have'} been organised. ${activeFollowUps} follow-up${activeFollowUps === 1 ? ' is' : 's are'} being tracked.`,
    ]
    if (activeCommitments > 0) {
      whatHappened.push(`${activeCommitments} active commitment${activeCommitments === 1 ? '' : 's'} and ${waitingFor} waiting-for item${waitingFor === 1 ? '' : 's'} remain open.`)
    }

    // Build recommendations from critical/high signals
    const recommendations = criticalSignals.map(s => ({
      id: s.id,
      text: `Consider addressing: ${s.suggestedAction}`,
      preparedBy: 'Chief of Staff',
    }))

    // Build memoryUpdates from recent KnowledgeNote records
    const memoryUpdates = recentNotes.map(n => ({
      entityType: n.type,
      entityName: n.title,
      change: 'added to memory',
      time: n.createdAt.toISOString(),
    }))

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
      whatHappened,
      recommendations,
      memoryUpdates,
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

    // Record timestamps for each stage so replay can build an accurate timeline
    const stageTimes: Record<string, string> = { started: new Date().toISOString() }
    const setStageWithTime = async (stage: string) => {
      stageTimes[stage] = new Date().toISOString()
      await setStage(stage)
    }

    try {
      await setStageWithTime('understanding')

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
            content: `From: ${message.fromName ?? ''} <${message.fromAddress}>\nSubject: ${message.subject ?? ''}\n\n${message.body.slice(0, 6000)}`,
          },
        ],
        responseFormat: 'json',
        maxTokens: 1500,
      })

      let parsed: Record<string, unknown>
      try { parsed = JSON.parse(result) } catch { parsed = { summary: result } }

      await setStageWithTime('extracting')

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: {
            whyItMatters: parsed.whyItMatters as string | null,
            entities: (parsed.entities ?? []) as unknown[],
          } as unknown as any,
        },
      })

      await setStageWithTime('recording')

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

      await setStageWithTime('remembering')

      // Auto-remember: store important context in Memory as narrative notes
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

      // Build Business Memory: upsert Person, Organization, Project, Decision
      // and link them all to this message
      await resolveEntities({
        userId,
        messageId: id,
        fromAddress: message.fromAddress,
        fromName: message.fromName ?? null,
        entities: (parsed.entities as Array<{ name: string; type: string; context: string }> | undefined) ?? [],
        memoryItems,
      })

      stageTimes.complete = new Date().toISOString()
      await prisma.aIJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          output: parsed as unknown as any,
          metadata: { stage: 'complete', stageTimes },
        },
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

  // ── Replay: lifecycle timeline for a single processed message ──────────────
  // Returns a chronological sequence of events without exposing AI prompts.
  fastify.get('/replay/:messageId', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { messageId } = req.params as { messageId: string }

    const [message, job, entities, suggestions, tasks] = await Promise.all([
      prisma.message.findFirst({ where: { id: messageId, userId } }),
      prisma.aIJob.findFirst({
        where: { userId, input: { path: ['messageId'], equals: messageId } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.messageEntity.count({ where: { messageId } }),
      prisma.suggestedAction.count({ where: { messageId } }),
      prisma.task.count({ where: { messageId, userId } }),
    ])

    if (!message) return reply.code(404).send({ error: 'Message not found' })

    type ReplayEvent = { ts: string; stage: string; label: string; detail: string | null }
    const events: ReplayEvent[] = []

    events.push({
      ts: message.receivedAt.toISOString(),
      stage: 'received',
      label: 'Received',
      detail: `From ${message.fromName ?? message.fromAddress}${message.subject ? ` · ${message.subject}` : ''}`,
    })

    if (job) {
      const stageTimes = (job.metadata as Record<string, Record<string, string>> | null)?.stageTimes ?? {}

      events.push({
        ts: stageTimes.understanding ?? job.startedAt?.toISOString() ?? job.createdAt.toISOString(),
        stage: 'reviewing',
        label: 'Reviewed',
        detail: 'Read and understood',
      })

      if (stageTimes.extracting) {
        events.push({
          ts: stageTimes.extracting,
          stage: 'extracting',
          label: 'Organized',
          detail: tasks > 0 ? `${tasks} item${tasks === 1 ? '' : 's'} added to your lists` : 'Nothing actionable found',
        })
      }

      if (stageTimes.remembering || entities > 0) {
        events.push({
          ts: stageTimes.remembering ?? job.completedAt?.toISOString() ?? job.createdAt.toISOString(),
          stage: 'memory',
          label: 'Context built',
          detail: entities > 0 ? `${entities} item${entities === 1 ? '' : 's'} added to memory` : 'No new context',
        })
      }

      if (suggestions > 0) {
        events.push({
          ts: stageTimes.recording ?? job.completedAt?.toISOString() ?? job.createdAt.toISOString(),
          stage: 'recommendations',
          label: 'Recommendations ready',
          detail: `${suggestions} action${suggestions === 1 ? '' : 's'} suggested`,
        })
      }

      if (job.status === 'completed' && stageTimes.complete) {
        events.push({ ts: stageTimes.complete, stage: 'complete', label: 'Ready', detail: null })
      } else if (job.status === 'failed') {
        events.push({
          ts: job.completedAt?.toISOString() ?? job.createdAt.toISOString(),
          stage: 'failed',
          label: 'Could not complete',
          detail: null,
        })
      }
    }

    events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

    return { messageId, events, processed: message.aiProcessed }
  })
}
