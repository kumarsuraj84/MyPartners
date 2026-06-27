import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma.js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PartnerActivity {
  partnerId: string
  partnerName: string
  action: string
  details: string
  time: string
  type: string
}

interface ApprovalItem {
  id: string
  type: 'message' | 'task'
  subject: string
  preview: string
  from: string
  preparedBy: string
  createdAt: string
}

interface AttentionItem {
  id: string
  title: string
  reason: string
  actionNeeded: string
  urgency: string
  source: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a human-readable partner name from an AIJob description/metadata */
function extractPartnerName(job: { type: string; metadata: unknown }): string {
  const meta = job.metadata as Record<string, unknown> | null
  if (meta && typeof meta['partnerName'] === 'string') return meta['partnerName']
  if (meta && typeof meta['partner'] === 'string') return meta['partner']
  // Derive from job type as fallback
  const typeMap: Record<string, string> = {
    email_processing: 'Email Assistant',
    brief_generation: 'Brief Assistant',
    task_creation: 'Task Assistant',
  }
  return typeMap[job.type] ?? 'AI Assistant'
}

function jobToAction(type: string): string {
  const map: Record<string, string> = {
    email_processing: 'Processed emails',
    brief_generation: 'Generated executive brief',
    task_creation: 'Created tasks from messages',
  }
  return map[type] ?? 'Ran AI job'
}

function jobDetails(job: { type: string; output: unknown; error: string | null }): string {
  if (job.error) return `Failed: ${job.error.slice(0, 120)}`
  const out = job.output as Record<string, unknown> | null
  if (!out) return `Completed ${job.type}`
  if (typeof out['summary'] === 'string') return out['summary'].slice(0, 200)
  if (typeof out['count'] === 'number') return `Processed ${out['count']} items`
  return `Completed successfully`
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export const partnersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /api/partners/activity — partner activity feed (last 24h)
  fastify.get('/activity', async (req) => {
    const { userId } = req.user as { userId: string }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const jobs = await prisma.aIJob.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        status: { in: ['completed', 'failed', 'running'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const activity: PartnerActivity[] = jobs.map((job) => ({
      partnerId: job.id,
      partnerName: extractPartnerName(job),
      action: jobToAction(job.type),
      details: jobDetails(job),
      time: job.completedAt?.toISOString() ?? job.createdAt.toISOString(),
      type: job.type,
    }))

    return activity
  })

  // GET /api/approvals — items waiting for executive approval
  fastify.get('/approvals', async (req) => {
    const { userId } = req.user as { userId: string }

    const [urgentMessages, pendingTasks] = await Promise.all([
      prisma.message.findMany({
        where: {
          userId,
          isRead: false,
          isArchived: false,
          priority: { in: ['urgent', 'high'] },
        },
        orderBy: { receivedAt: 'desc' },
        take: 30,
      }),
      prisma.task.findMany({
        where: {
          userId,
          status: 'pending',
          category: { in: ['task', 'follow_up'] },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 30,
      }),
    ])

    const items: ApprovalItem[] = [
      ...urgentMessages.map((m) => ({
        id: m.id,
        type: 'message' as const,
        subject: m.subject ?? '(no subject)',
        preview: m.summary ?? m.body.slice(0, 200),
        from: m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress,
        preparedBy: 'Email Assistant',
        createdAt: m.receivedAt.toISOString(),
      })),
      ...pendingTasks.map((t) => ({
        id: t.id,
        type: 'task' as const,
        subject: t.title,
        preview: t.description ?? '',
        from: t.assigneeName ?? 'Unassigned',
        preparedBy: 'Task Assistant',
        createdAt: t.createdAt.toISOString(),
      })),
    ]

    // Sort by createdAt descending
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return items
  })

  // GET /api/partners/attention — items needing executive attention
  fastify.get('/attention', async (req) => {
    const { userId } = req.user as { userId: string }

    const signals = await prisma.signal.findMany({
      where: {
        userId,
        urgency: { in: ['critical', 'high'] },
        isDismissed: false,
        isResolved: false,
      },
      orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
      take: 30,
    })

    const items: AttentionItem[] = signals.map((s) => ({
      id: s.id,
      title: s.title,
      reason: s.reason,
      actionNeeded: s.suggestedAction,
      urgency: s.urgency,
      source: s.entityType ?? 'system',
    }))

    return items
  })

  // POST /api/partners/approvals/:id/approve
  fastify.post('/approvals/:id/approve', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }

    // Try message first, then task
    const message = await prisma.message.findFirst({ where: { id, userId } })
    if (message) {
      await prisma.message.update({ where: { id }, data: { isRead: true } })
      return { ok: true, type: 'message', id }
    }

    const task = await prisma.task.findFirst({ where: { id, userId } })
    if (task) {
      await prisma.task.update({ where: { id }, data: { status: 'in_progress' } })
      return { ok: true, type: 'task', id }
    }

    reply.code(404)
    return { error: 'Item not found' }
  })

  // POST /api/partners/approvals/:id/dismiss
  fastify.post('/approvals/:id/dismiss', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }

    // Try message first, then task, then signal
    const message = await prisma.message.findFirst({ where: { id, userId } })
    if (message) {
      await prisma.message.update({ where: { id }, data: { isArchived: true, isRead: true } })
      return { ok: true, type: 'message', id }
    }

    const task = await prisma.task.findFirst({ where: { id, userId } })
    if (task) {
      await prisma.task.update({ where: { id }, data: { status: 'cancelled' } })
      return { ok: true, type: 'task', id }
    }

    const signal = await prisma.signal.findFirst({ where: { id, userId } })
    if (signal) {
      await prisma.signal.update({ where: { id }, data: { isDismissed: true } })
      return { ok: true, type: 'signal', id }
    }

    reply.code(404)
    return { error: 'Item not found' }
  })
}
