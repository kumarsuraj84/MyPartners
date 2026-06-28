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

type WorkState = 'working' | 'waiting' | 'completed'
type PartnerStatus = 'Reviewing' | 'Preparing' | 'Organizing' | 'Following Up' | 'Waiting for Approval' | 'Ready'

interface PartnerState {
  id: string
  workState: WorkState
  status: PartnerStatus
  focus: string
  needsAttention: string | null
  waitingForYou: string | null
  recentlyCompleted: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a human-readable partner name from an AIJob description/metadata */
function extractPartnerName(job: { type: string; metadata: unknown }): string {
  const meta = job.metadata as Record<string, unknown> | null
  if (meta && typeof meta['partnerName'] === 'string') return meta['partnerName']
  if (meta && typeof meta['partner'] === 'string') return meta['partner']
  // Derive from job type as fallback
  const typeMap: Record<string, string> = {
    email_processing: 'Communication Partner',
    brief_generation: 'Chief of Staff',
    task_creation: 'Follow-up Partner',
  }
  return typeMap[job.type] ?? 'Chief of Staff'
}

function jobToAction(type: string): string {
  const map: Record<string, string> = {
    email_processing: 'Reviewed and organised inbox',
    brief_generation: 'Prepared executive brief',
    task_creation: 'Organised follow-ups from messages',
  }
  return map[type] ?? 'Reviewed and prepared'
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

  // GET /api/partners/state — live workState for all 5 named partners
  fastify.get('/state', async (req) => {
    const { userId } = req.user as { userId: string }

    const [activeJobs, recentJobs, urgentMessages, pendingFollowUps, overdueTasks, activeSignals] =
      await Promise.all([
        // Jobs currently running or pending
        prisma.aIJob.findMany({
          where: { userId, status: { in: ['running', 'pending'] } },
          orderBy: { createdAt: 'desc' },
        }),
        // Recently completed jobs (last 24h)
        prisma.aIJob.findMany({
          where: {
            userId,
            status: 'completed',
            completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        }),
        // Unread urgent/high messages
        prisma.message.findMany({
          where: { userId, isRead: false, isArchived: false, priority: { in: ['urgent', 'high'] } },
          orderBy: { receivedAt: 'desc' },
          take: 5,
        }),
        // Pending follow_up tasks
        prisma.task.findMany({
          where: { userId, status: 'pending', category: 'follow_up' },
          orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
          take: 10,
        }),
        // Overdue tasks (dueDate in the past, not completed/cancelled)
        prisma.task.findMany({
          where: {
            userId,
            status: { in: ['pending', 'in_progress'] },
            dueDate: { lt: new Date() },
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
        }),
        // Active (non-dismissed, non-resolved) signals
        prisma.signal.findMany({
          where: { userId, isDismissed: false, isResolved: false },
          orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
          take: 10,
        }),
      ])

    const isJobRunning = (typePattern: RegExp) =>
      activeJobs.some((j) => typePattern.test(j.type))

    const recentlyCompletedLabels = (typePattern: RegExp): string[] =>
      recentJobs
        .filter((j) => typePattern.test(j.type))
        .map((j) => jobToAction(j.type))
        .slice(0, 3)

    // ── chief-of-staff ────────────────────────────────────────────────────────
    let chiefWorkState: WorkState
    let chiefStatus: PartnerStatus
    let chiefFocus: string
    let chiefNeedsAttention: string | null = null
    let chiefWaitingForYou: string | null = null

    if (isJobRunning(/brief_generation/)) {
      chiefWorkState = 'working'
      chiefStatus = 'Preparing'
      chiefFocus = 'Preparing your executive brief'
    } else if (activeJobs.length > 0) {
      chiefWorkState = 'working'
      chiefStatus = 'Reviewing'
      chiefFocus = 'Coordinating active AI jobs'
    } else if (activeSignals.length > 0) {
      chiefWorkState = 'waiting'
      chiefStatus = 'Waiting for Approval'
      chiefFocus = `${activeSignals.length} signal${activeSignals.length > 1 ? 's' : ''} awaiting your review`
      chiefWaitingForYou = `Review ${activeSignals.length} pending signal${activeSignals.length > 1 ? 's' : ''}`
    } else {
      chiefWorkState = 'completed'
      chiefStatus = 'Ready'
      chiefFocus = 'All briefs prepared, inbox clear'
    }

    // ── communication ─────────────────────────────────────────────────────────
    let commWorkState: WorkState
    let commStatus: PartnerStatus
    let commFocus: string
    let commNeedsAttention: string | null = null
    let commWaitingForYou: string | null = null

    if (isJobRunning(/email_processing/)) {
      commWorkState = 'working'
      commStatus = 'Reviewing'
      commFocus = 'Processing and prioritising your inbox'
    } else if (urgentMessages.length > 0) {
      commWorkState = 'waiting'
      commStatus = 'Waiting for Approval'
      commFocus = `${urgentMessages.length} urgent message${urgentMessages.length > 1 ? 's' : ''} need your attention`
      commWaitingForYou = `Review ${urgentMessages.length} urgent message${urgentMessages.length > 1 ? 's' : ''}`
      const top = urgentMessages[0]
      commNeedsAttention = top
        ? `"${top.subject ?? '(no subject)'}" from ${top.fromName ?? top.fromAddress}`
        : null
    } else {
      commWorkState = 'completed'
      commStatus = 'Ready'
      commFocus = 'Inbox clear, no urgent messages'
    }

    // ── followup ──────────────────────────────────────────────────────────────
    let followupWorkState: WorkState
    let followupStatus: PartnerStatus
    let followupFocus: string
    let followupNeedsAttention: string | null = null
    let followupWaitingForYou: string | null = null

    if (pendingFollowUps.length > 0) {
      followupWorkState = 'working'
      followupStatus = 'Following Up'
      followupFocus = `${pendingFollowUps.length} follow-up${pendingFollowUps.length > 1 ? 's' : ''} in progress`
      const top = pendingFollowUps[0]
      if (top) followupNeedsAttention = top.title
    } else if (overdueTasks.length > 0) {
      followupWorkState = 'waiting'
      followupStatus = 'Waiting for Approval'
      followupFocus = `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} need attention`
      followupWaitingForYou = `Resolve ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`
    } else {
      followupWorkState = 'completed'
      followupStatus = 'Ready'
      followupFocus = 'All follow-ups on track'
    }

    // ── meeting ───────────────────────────────────────────────────────────────
    const meetingState: PartnerState = {
      id: 'meeting',
      workState: 'completed',
      status: 'Ready',
      focus: 'No calendar integration yet — coming soon',
      needsAttention: null,
      waitingForYou: null,
      recentlyCompleted: [],
    }

    // ── memory ────────────────────────────────────────────────────────────────
    let memoryWorkState: WorkState
    let memoryStatus: PartnerStatus
    let memoryFocus: string

    if (isJobRunning(/memory|knowledge|note/)) {
      memoryWorkState = 'working'
      memoryStatus = 'Organizing'
      memoryFocus = 'Organising business memory'
    } else {
      memoryWorkState = 'completed'
      memoryStatus = 'Ready'
      memoryFocus = 'Business memory up to date'
    }

    const states: PartnerState[] = [
      {
        id: 'chief-of-staff',
        workState: chiefWorkState,
        status: chiefStatus,
        focus: chiefFocus,
        needsAttention: chiefNeedsAttention,
        waitingForYou: chiefWaitingForYou,
        recentlyCompleted: recentlyCompletedLabels(/brief_generation/),
      },
      {
        id: 'communication',
        workState: commWorkState,
        status: commStatus,
        focus: commFocus,
        needsAttention: commNeedsAttention,
        waitingForYou: commWaitingForYou,
        recentlyCompleted: recentlyCompletedLabels(/email_processing/),
      },
      {
        id: 'followup',
        workState: followupWorkState,
        status: followupStatus,
        focus: followupFocus,
        needsAttention: followupNeedsAttention,
        waitingForYou: followupWaitingForYou,
        recentlyCompleted: recentlyCompletedLabels(/task_creation/),
      },
      meetingState,
      {
        id: 'memory',
        workState: memoryWorkState,
        status: memoryStatus,
        focus: memoryFocus,
        needsAttention: null,
        waitingForYou: null,
        recentlyCompleted: recentlyCompletedLabels(/memory|knowledge|note/),
      },
    ]

    return states
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

  // GET /api/partners/stats — task stats for partner workState derivation
  fastify.get('/stats', async (req) => {
    const { userId } = req.user as { userId: string }
    const now = new Date()

    const [overdue, commitments, waitingFor] = await Promise.all([
      prisma.task.count({
        where: {
          userId,
          status: { in: ['pending', 'in_progress'] },
          category: { in: ['task', 'commitment', 'follow_up'] },
          dueDate: { lt: now },
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: { in: ['pending', 'in_progress'] },
          category: 'commitment',
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: { in: ['pending', 'in_progress'] },
          category: 'waiting_for',
        },
      }),
    ])

    return { overdue, commitments, waiting_for: waitingFor }
  })
}
