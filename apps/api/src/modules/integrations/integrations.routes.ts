import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const integrationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.integration.findMany({ where: { userId } })
  })

  fastify.get('/gmail/connect', async (req, reply) => {
    const clientId = process.env.GMAIL_CLIENT_ID
    const redirectUri = process.env.GMAIL_REDIRECT_URI
    if (!clientId || !redirectUri) {
      return reply.code(400).send({ error: 'Gmail integration not configured' })
    }
    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(clientId, process.env.GMAIL_CLIENT_SECRET, redirectUri)
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      state: (req.user as { userId: string }).userId,
    })
    reply.redirect(url)
  })

  fastify.get('/gmail/callback', async (req, reply) => {
    const { code, state: userId } = req.query as { code: string; state: string }
    const clientId = process.env.GMAIL_CLIENT_ID!
    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(clientId, process.env.GMAIL_CLIENT_SECRET, process.env.GMAIL_REDIRECT_URI)
    const { tokens } = await oauth2Client.getToken(code)

    await prisma.integration.upsert({
      where: { userId_provider: { userId, provider: 'gmail' } },
      create: {
        userId,
        provider: 'gmail',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        isActive: true,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        isActive: true,
      },
    })

    reply.redirect((process.env.FRONTEND_URL ?? 'http://localhost:3000') + '?gmail=connected')
  })

  fastify.delete('/:provider', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { provider } = req.params as { provider: string }
    await prisma.integration.update({ where: { userId_provider: { userId, provider } }, data: { isActive: false } })
    reply.code(204)
  })
}
