import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getConfig, getCategoryConfig, setConfig, CONFIG_DEFAULTS } from '../../lib/config.js'
import { audit } from '../../lib/audit.js'
import { can } from '../../lib/permissions.js'
import { prisma } from '../../lib/prisma.js'

export const configRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // Returns the full merged config (defaults + overrides) for the authenticated tenant
  fastify.get('/', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (!can(user.role, 'viewConfig')) return reply.code(403).send({ error: 'Forbidden' })

    const categories = Object.keys(CONFIG_DEFAULTS)
    const result: Record<string, Record<string, unknown>> = {}
    for (const cat of categories) result[cat] = await getCategoryConfig(userId, cat)
    return result
  })

  // Returns one config category
  fastify.get<{ Params: { category: string } }>('/:category', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (!can(user.role, 'viewConfig')) return reply.code(403).send({ error: 'Forbidden' })
    return getCategoryConfig(userId, req.params.category)
  })

  // Sets a single config key
  const SetConfigBody = z.object({ value: z.unknown() })

  fastify.put<{
    Params: { category: string; key: string }
    Body: { value: unknown }
  }>('/:category/:key', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (!can(user.role, 'manageConfig')) return reply.code(403).send({ error: 'Forbidden' })

    const { category, key } = req.params
    const { value } = SetConfigBody.parse(req.body)
    const before = await getConfig(userId, category, key)

    await setConfig(userId, category, key, value, userId)

    await audit({
      tenantId: userId,
      userId,
      action: 'config_changed',
      entity: 'config',
      entityId: `${category}.${key}`,
      before,
      after: value,
    })

    return { category, key, value }
  })

  // Deletes a config override (restores default)
  fastify.delete<{ Params: { category: string; key: string } }>('/:category/:key', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (!can(user.role, 'manageConfig')) return reply.code(403).send({ error: 'Forbidden' })

    const { category, key } = req.params
    const before = await getConfig(userId, category, key)

    await prisma.tenantConfig.deleteMany({ where: { tenantId: userId, category, key } })

    await audit({
      tenantId: userId,
      userId,
      action: 'config_changed',
      entity: 'config',
      entityId: `${category}.${key}`,
      before,
      after: CONFIG_DEFAULTS[category]?.[key],
      metadata: { action: 'reset_to_default' },
    })

    reply.code(204)
  })
}
