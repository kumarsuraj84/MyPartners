import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { CONFIG_DEFAULTS, setConfig } from '../../lib/config.js'

async function requireAdmin(req: { user: unknown }, reply: { code: (n: number) => { send: (b: unknown) => void } }) {
  const { role } = req.user as { role?: string }
  if (role !== 'owner' && role !== 'administrator') {
    reply.code(403).send({ error: 'Administrator role required' })
    return false
  }
  return true
}

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // ── Platform overview ─────────────────────────────────────────────────────
  fastify.get('/overview', async (req, reply) => {
    if (!await requireAdmin(req, reply)) return

    const today = new Date(); today.setHours(0, 0, 0, 0)

    const [
      totalUsers,
      totalMessages,
      totalTasks,
      totalJobs,
      totalIntegrations,
      activeIntegrations,
      jobsToday,
      jobErrorsToday,
      messagesProcessedToday,
      recentJobs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.message.count(),
      prisma.task.count(),
      prisma.aIJob.count(),
      prisma.integration.count(),
      prisma.integration.count({ where: { isActive: true } }),
      prisma.aIJob.count({ where: { createdAt: { gte: today } } }),
      prisma.aIJob.count({ where: { createdAt: { gte: today }, status: 'failed' } }),
      prisma.message.count({ where: { createdAt: { gte: today }, aiProcessed: true } }),
      prisma.aIJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, type: true, status: true, createdAt: true,
          completedAt: true, error: true, startedAt: true,
          user: { select: { email: true, name: true } },
        },
      }),
    ])

    return {
      totalUsers, totalMessages, totalTasks, totalJobs,
      totalIntegrations, activeIntegrations,
      jobsToday, jobErrorsToday, messagesProcessedToday,
      errorRateToday: jobsToday > 0 ? Math.round((jobErrorsToday / jobsToday) * 100) : 0,
      recentJobs,
    }
  })

  // ── All users ─────────────────────────────────────────────────────────────
  fastify.get('/users', async (req, reply) => {
    if (!await requireAdmin(req, reply)) return

    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, role: true, plan: true,
        createdAt: true, updatedAt: true,
        _count: {
          select: {
            integrations: true,
            messages: true,
          },
        },
      },
    })
  })

  // ── Update user plan ──────────────────────────────────────────────────────
  fastify.put<{ Params: { id: string }; Body: { plan: string } }>('/users/:id/plan', async (req, reply) => {
    if (!await requireAdmin(req, reply)) return
    const { plan } = z.object({ plan: z.enum(['free', 'starter', 'professional', 'enterprise']) }).parse(req.body)
    return prisma.user.update({ where: { id: req.params.id }, data: { plan } })
  })

  // ── Update user role ──────────────────────────────────────────────────────
  fastify.put<{ Params: { id: string }; Body: { role: string } }>('/users/:id/role', async (req, reply) => {
    if (!await requireAdmin(req, reply)) return
    const { role } = z.object({ role: z.enum(['owner', 'administrator', 'executive', 'manager', 'assistant']) }).parse(req.body)
    return prisma.user.update({ where: { id: req.params.id }, data: { role } })
  })

  // ── All AI jobs ───────────────────────────────────────────────────────────
  fastify.get('/jobs', async (req, reply) => {
    if (!await requireAdmin(req, reply)) return

    const { page = 1, limit = 50, status, userId } = req.query as {
      page?: number; limit?: number; status?: string; userId?: string
    }
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (userId) where.userId = userId

    const [jobs, total] = await Promise.all([
      prisma.aIJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true, type: true, status: true, error: true,
          createdAt: true, startedAt: true, completedAt: true,
          metadata: true,
          user: { select: { email: true, name: true } },
        },
      }),
      prisma.aIJob.count({ where }),
    ])

    return { jobs, total, page: Number(page), limit: Number(limit) }
  })

  // ── All connectors ────────────────────────────────────────────────────────
  fastify.get('/connectors', async (req, reply) => {
    if (!await requireAdmin(req, reply)) return

    return prisma.integration.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, provider: true, isActive: true,
        expiresAt: true, createdAt: true, updatedAt: true,
        metadata: true,
        user: { select: { id: true, email: true, name: true } },
      },
    })
  })

  // ── Tenants (users-as-tenants in V1) ─────────────────────────────────────
  fastify.get('/tenants', async (req, reply) => {
    if (!await requireAdmin(req, reply)) return

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, plan: true, role: true, createdAt: true,
        _count: {
          select: { messages: true, tasks: true, integrations: true, aiJobs: true },
        },
      },
    })

    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      plan: u.plan,
      role: u.role,
      createdAt: u.createdAt,
      stats: {
        messages: u._count.messages,
        tasks: u._count.tasks,
        integrations: u._count.integrations,
        aiJobs: u._count.aiJobs,
      },
    }))
  })

  // ── Feature flags ─────────────────────────────────────────────────────────
  fastify.get('/flags', async (req, reply) => {
    if (!await requireAdmin(req, reply)) return

    const defaults = CONFIG_DEFAULTS['feature_flags'] as Record<string, boolean>
    const overrides = await prisma.tenantConfig.findMany({
      where: { category: 'feature_flags' },
      select: { tenantId: true, key: true, value: true },
    })

    return Object.entries(defaults).map(([flag, defaultValue]) => ({
      flag,
      defaultValue,
      overrides: overrides
        .filter(o => o.key === flag)
        .map(o => ({ tenantId: o.tenantId, value: o.value })),
    }))
  })

  fastify.put<{ Params: { tenantId: string; flag: string }; Body: { enabled: boolean } }>(
    '/flags/:tenantId/:flag',
    async (req, reply) => {
      if (!await requireAdmin(req, reply)) return
      const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body)
      const actorId = (req.user as { userId: string }).userId
      await setConfig(req.params.tenantId, 'feature_flags', req.params.flag, enabled, actorId)
      reply.code(204)
    },
  )

  // ── Platform-wide audit log ───────────────────────────────────────────────
  fastify.get('/audit', async (req, reply) => {
    if (!await requireAdmin(req, reply)) return

    const { limit = 50, cursor, action, entity, userId } = req.query as {
      limit?: number; cursor?: string; action?: string; entity?: string; userId?: string
    }

    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (entity) where.entity = entity
    if (userId) where.userId = userId
    if (cursor) where.id = { lt: cursor }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit) + 1,
    })

    const hasMore = logs.length > Number(limit)
    if (hasMore) logs.pop()

    return {
      logs,
      nextCursor: hasMore ? logs[logs.length - 1]?.id : null,
    }
  })

  // ── All tenant configs ────────────────────────────────────────────────────
  fastify.get('/config', async (req, reply) => {
    if (!await requireAdmin(req, reply)) return

    const all = await prisma.tenantConfig.findMany({
      orderBy: [{ tenantId: 'asc' }, { category: 'asc' }, { key: 'asc' }],
    })

    const grouped: Record<string, Record<string, Record<string, unknown>>> = {}
    for (const row of all) {
      grouped[row.tenantId] ??= {}
      grouped[row.tenantId][row.category] ??= {}
      grouped[row.tenantId][row.category][row.key] = row.value
    }

    return { defaults: CONFIG_DEFAULTS, overrides: grouped }
  })
}
