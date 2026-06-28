import type { FastifyPluginAsync } from 'fastify'
import { randomBytes } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { getConnector, listConnectors } from '../../lib/connector.js'
import { audit } from '../../lib/audit.js'

export const integrationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // List active integrations for this user
  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.integration.findMany({ where: { userId } })
  })

  // List all registered connectors (shows what's available to connect)
  fastify.get('/available', async () => listConnectors())

  // ─── Generic connect/callback via connector registry ────────────────────────
  // Any future connector only needs to implement the Connector interface and
  // register itself — no new routes required.

  fastify.get<{ Params: { provider: string } }>('/:provider/connect', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const connector = getConnector(req.params.provider)
    if (!connector) return reply.code(404).send({ error: 'Unknown provider' })

    try {
      // Generate a CSRF nonce and embed it in the OAuth state param
      const nonce = randomBytes(16).toString('hex')
      const state = JSON.stringify({ userId, nonce })
      const url = await connector.getAuthUrl(userId, state)
      // Store nonce in a signed, httpOnly, sameSite:strict cookie for CSRF verification on callback
      reply.setCookie(`oauth_nonce_${req.params.provider}`, nonce, {
        httpOnly: true,
        sameSite: 'strict',
        signed: true,
        path: '/',
        maxAge: 600, // 10 minutes — enough time to complete OAuth flow
      })
      reply.redirect(url)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      reply.code(400).send({ error: msg })
    }
  })

  fastify.get<{ Params: { provider: string }; Querystring: { code: string; state: string } }>(
    '/:provider/callback',
    async (req, reply) => {
      const connector = getConnector(req.params.provider)
      if (!connector) return reply.code(404).send({ error: 'Unknown provider' })

      const { code, state: rawState } = req.query

      // Verify CSRF nonce: cookie nonce must match nonce embedded in state param
      let userId: string
      try {
        const { userId: uid, nonce: stateNonce } = JSON.parse(rawState) as { userId: string; nonce: string }
        const cookieNonce = req.unsignCookie(
          req.cookies[`oauth_nonce_${req.params.provider}`] ?? '',
        )
        if (!cookieNonce.valid || cookieNonce.value !== stateNonce) {
          return reply.code(400).send({ error: 'Invalid OAuth state' })
        }
        // Clear the nonce cookie after successful verification
        reply.clearCookie(`oauth_nonce_${req.params.provider}`, { path: '/' })
        userId = uid
      } catch {
        return reply.code(400).send({ error: 'Invalid OAuth state' })
      }

      await connector.handleCallback(code, userId)

      await audit({
        tenantId: userId,
        userId,
        action: 'connected',
        entity: 'integration',
        entityId: req.params.provider,
        after: { provider: req.params.provider },
      })

      reply.redirect((process.env.FRONTEND_URL ?? 'http://localhost:4000') + `?${req.params.provider}=connected`)
    },
  )

  // Health check for a connected integration
  fastify.get<{ Params: { provider: string } }>('/:provider/health', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const connector = getConnector(req.params.provider)
    if (!connector) return reply.code(404).send({ error: 'Unknown provider' })

    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId, provider: req.params.provider } },
    })
    if (!integration) return { connected: false, healthy: false, error: 'Not connected' }

    return connector.healthCheck({
      provider: req.params.provider,
      userId,
      accessToken: integration.accessToken,
      refreshToken: integration.refreshToken,
      expiresAt: integration.expiresAt,
    })
  })

  // Disconnect
  fastify.delete<{ Params: { provider: string } }>('/:provider', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const connector = getConnector(req.params.provider)
    if (!connector) return reply.code(404).send({ error: 'Unknown provider' })

    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId, provider: req.params.provider } },
    })
    if (!integration) return reply.code(404).send({ error: 'Integration not found' })

    await connector.disconnect({ provider: req.params.provider, userId })

    await audit({
      tenantId: userId,
      userId,
      action: 'disconnected',
      entity: 'integration',
      entityId: req.params.provider,
    })

    reply.code(204)
  })

  // ─── Legacy Gmail routes kept for backwards compatibility ────────────────────
  // Delegates to the Gmail connector through the generic routes above.

  fastify.get('/gmail/connect', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const connector = getConnector('gmail')
    if (!connector) return reply.code(400).send({ error: 'Gmail integration not configured' })
    try {
      const nonce = randomBytes(16).toString('hex')
      const state = JSON.stringify({ userId, nonce })
      reply.setCookie('oauth_nonce_gmail', nonce, {
        httpOnly: true,
        sameSite: 'strict',
        signed: true,
        path: '/',
        maxAge: 600,
      })
      reply.redirect(await connector.getAuthUrl(userId, state))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gmail connection failed'
      reply.code(400).send({ error: msg })
    }
  })

  fastify.get('/gmail/callback', async (req, reply) => {
    const { code, state: rawState } = req.query as { code: string; state: string }

    // Verify CSRF nonce
    let userId: string
    try {
      const { userId: uid, nonce: stateNonce } = JSON.parse(rawState) as { userId: string; nonce: string }
      const cookieNonce = req.unsignCookie(req.cookies['oauth_nonce_gmail'] ?? '')
      if (!cookieNonce.valid || cookieNonce.value !== stateNonce) {
        return reply.code(400).send({ error: 'Invalid OAuth state' })
      }
      reply.clearCookie('oauth_nonce_gmail', { path: '/' })
      userId = uid
    } catch {
      return reply.code(400).send({ error: 'Invalid OAuth state' })
    }

    const connector = getConnector('gmail')!
    await connector.handleCallback(code, userId)
    await audit({ tenantId: userId, userId, action: 'connected', entity: 'integration', entityId: 'gmail' })
    reply.redirect((process.env.FRONTEND_URL ?? 'http://localhost:4000') + '?gmail=connected')
  })
}
