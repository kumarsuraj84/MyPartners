import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { getCategoryConfig, setConfig } from '../../lib/config.js'

type PolicyMode = 'manual' | 'confirm_once' | 'always' | 'disabled'

interface ExecuteBody {
  actionType: string
  label: string
  targetId?: string
  targetType?: string
  params?: Record<string, unknown>
}

async function checkPolicy(tenantId: string, actionType: string): Promise<PolicyMode> {
  const policies = await getCategoryConfig<Record<string, PolicyMode>>(tenantId, 'action_policies')
  return policies[actionType] ?? 'manual'
}

export const actionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /api/actions/suggested
  fastify.get('/suggested', async (req) => {
    const { userId } = req.user as { userId: string }
    // In V1, tenantId = userId
    const tenantId = userId

    const suggested: Array<{
      id: string
      actionType: string
      label: string
      description: string
      targetId?: string
      targetType?: string
      policy: PolicyMode
    }> = []

    // Newsletters to archive
    const newsletters = await prisma.message.findMany({
      where: { userId, isRead: false, messageCategory: 'newsletter' },
      take: 5,
      orderBy: { receivedAt: 'desc' },
    })
    for (const m of newsletters) {
      suggested.push({
        id: `archive-${m.id}`,
        actionType: 'archive_newsletter',
        label: `Archive "${m.subject ?? 'newsletter'}"`,
        description: `From ${m.fromName ?? m.fromAddress}`,
        targetId: m.id,
        targetType: 'message',
        policy: await checkPolicy(tenantId, 'archive_newsletter'),
      })
    }

    // Overdue waiting-for tasks
    const overdueWaiting = await prisma.task.findMany({
      where: {
        userId,
        category: 'waiting_for',
        status: 'pending',
        dueDate: { lt: new Date() },
      },
      take: 5,
      orderBy: { dueDate: 'asc' },
    })
    for (const t of overdueWaiting) {
      suggested.push({
        id: `followup-${t.id}`,
        actionType: 'send_followup_reminder',
        label: `Follow up on "${t.title}"`,
        description: `Overdue by ${Math.floor((Date.now() - (t.dueDate?.getTime() ?? 0)) / 86400000)} days`,
        targetId: t.id,
        targetType: 'task',
        policy: await checkPolicy(tenantId, 'send_followup_reminder'),
      })
    }

    // Informational messages to mark done
    const informational = await prisma.message.findMany({
      where: { userId, isRead: false, messageCategory: 'fyi' },
      take: 5,
      orderBy: { receivedAt: 'desc' },
    })
    for (const m of informational) {
      suggested.push({
        id: `markdone-${m.id}`,
        actionType: 'mark_informational_done',
        label: `Mark "${m.subject ?? 'message'}" as done`,
        description: `From ${m.fromName ?? m.fromAddress}`,
        targetId: m.id,
        targetType: 'message',
        policy: await checkPolicy(tenantId, 'mark_informational_done'),
      })
    }

    return suggested
  })

  // GET /api/actions/policies
  fastify.get('/policies', async (req) => {
    const { userId } = req.user as { userId: string }
    return getCategoryConfig(userId, 'action_policies')
  })

  // POST /api/actions/policies
  fastify.post('/policies', async (req) => {
    const { userId } = req.user as { userId: string }
    const body = req.body as Record<string, PolicyMode>
    for (const [key, value] of Object.entries(body)) {
      await setConfig(userId, 'action_policies', key, value, userId)
    }
    await prisma.auditLog.create({
      data: {
        tenantId: userId,
        userId,
        action: 'action_policies.updated',
        entity: 'config',
        entityId: userId,
        after: body as never,
      },
    })
    return { ok: true }
  })

  // GET /api/actions/history
  fastify.get('/history', async (req) => {
    const { userId } = req.user as { userId: string }
    const jobs = await prisma.aIJob.findMany({
      where: { userId, type: { startsWith: 'action:' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return jobs.map((j) => ({
      id: j.id,
      actionType: j.type.replace('action:', ''),
      label: (j.input as Record<string, unknown>)?.label ?? j.type,
      status: j.status,
      createdAt: j.createdAt,
      completedAt: j.completedAt,
      reversible: !!(j.output as Record<string, unknown>)?.reversalData,
      reversed: !!(j.output as Record<string, unknown>)?.reversed,
    }))
  })

  // POST /api/actions/execute
  fastify.post('/execute', async (req) => {
    const { userId } = req.user as { userId: string }
    const tenantId = userId

    const body = req.body as ExecuteBody
    const { actionType, label, targetId, targetType, params = {} } = body
    const policy = await checkPolicy(tenantId, actionType)

    if (policy === 'disabled') {
      return { ok: false, reason: 'This action is disabled.' }
    }

    let reversalData: Record<string, unknown> | null = null
    let result: Record<string, unknown> = {}

    if (actionType === 'archive_newsletter' && targetId) {
      const msg = await prisma.message.findUnique({ where: { id: targetId } })
      if (msg) {
        reversalData = { messageId: targetId, wasRead: msg.isRead, wasArchived: msg.isArchived }
        await prisma.message.update({ where: { id: targetId }, data: { isArchived: true, isRead: true } })
        result = { archived: true }
      }
    } else if (actionType === 'mark_informational_done' && targetId) {
      const msg = await prisma.message.findUnique({ where: { id: targetId } })
      if (msg) {
        reversalData = { messageId: targetId, wasRead: msg.isRead }
        await prisma.message.update({ where: { id: targetId }, data: { isRead: true } })
        result = { markedDone: true }
      }
    } else if (actionType === 'send_followup_reminder' && targetId) {
      const task = await prisma.task.findUnique({ where: { id: targetId } })
      if (task) {
        reversalData = { taskId: targetId, prevStatus: task.status }
        await prisma.task.update({ where: { id: targetId }, data: { status: 'in_progress' } })
        result = { reminderSent: true }
      }
    } else if (actionType === 'prepare_meeting_brief' && targetId) {
      reversalData = { jobId: targetId }
      result = { briefPrepared: true, note: 'Meeting brief prepared by your Office' }
    }

    const job = await prisma.aIJob.create({
      data: {
        userId,
        type: `action:${actionType}`,
        status: 'completed',
        input: { label, targetId, targetType, params, policy } as never,
        output: { ...result, reversalData } as never,
        completedAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: `action:${actionType}`,
        entity: targetType ?? 'unknown',
        entityId: targetId ?? job.id,
        after: { ...result, label, params } as never,
      },
    })

    return { ok: true, jobId: job.id, result }
  })

  // POST /api/actions/:jobId/reverse
  fastify.post('/:jobId/reverse', async (req) => {
    const { userId } = req.user as { userId: string }
    const { jobId } = req.params as { jobId: string }
    const job = await prisma.aIJob.findFirst({ where: { id: jobId, userId } })
    if (!job) throw new Error('Action not found')

    const output = job.output as Record<string, unknown>
    const reversalData = output?.reversalData as Record<string, unknown> | undefined
    if (!reversalData) return { ok: false, reason: 'This action cannot be reversed.' }
    if (output?.reversed) return { ok: false, reason: 'Already reversed.' }

    const actionType = job.type.replace('action:', '')

    if (actionType === 'archive_newsletter' && reversalData.messageId) {
      await prisma.message.update({
        where: { id: reversalData.messageId as string },
        data: { isArchived: reversalData.wasArchived as boolean, isRead: reversalData.wasRead as boolean },
      })
    } else if (actionType === 'mark_informational_done' && reversalData.messageId) {
      await prisma.message.update({
        where: { id: reversalData.messageId as string },
        data: { isRead: reversalData.wasRead as boolean },
      })
    } else if (actionType === 'send_followup_reminder' && reversalData.taskId) {
      await prisma.task.update({
        where: { id: reversalData.taskId as string },
        data: { status: reversalData.prevStatus as string },
      })
    }

    await prisma.aIJob.update({
      where: { id: jobId },
      data: { output: { ...output, reversed: true } as never },
    })

    await prisma.auditLog.create({
      data: {
        tenantId: userId,
        userId,
        action: `action:${actionType}:reversed`,
        entity: 'ai_job',
        entityId: jobId,
        after: { reversed: true } as never,
      },
    })

    return { ok: true }
  })

  // Legacy SuggestedAction routes (keep for backward compat)
  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.suggestedAction.findMany({
      where: { userId, isDismissed: false, isActedOn: false },
      include: { message: { select: { subject: true, fromName: true, fromAddress: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  })

  fastify.patch('/:id/dismiss', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    return prisma.suggestedAction.update({ where: { id, userId }, data: { isDismissed: true } })
  })

  fastify.patch('/:id/act', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    return prisma.suggestedAction.update({ where: { id, userId }, data: { isActedOn: true } })
  })
}
