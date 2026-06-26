import Fastify from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './modules/auth/auth.routes.js'
import { messagesRoutes } from './modules/messages/messages.routes.js'
import { tasksRoutes } from './modules/tasks/tasks.routes.js'
import { knowledgeRoutes } from './modules/knowledge/knowledge.routes.js'
import { integrationsRoutes } from './modules/integrations/integrations.routes.js'
import { briefRoutes } from './modules/brief/brief.routes.js'
import { aiRoutes } from './modules/ai/ai.routes.js'
import { prisma } from './lib/prisma.js'

const app = Fastify({ logger: true })

// Plugins
await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
})
await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev_secret_change_me' })
await app.register(cookie)
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })

// Auth decorator
app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// Routes
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(messagesRoutes, { prefix: '/api/messages' })
await app.register(tasksRoutes, { prefix: '/api/tasks' })
await app.register(knowledgeRoutes, { prefix: '/api/knowledge' })
await app.register(integrationsRoutes, { prefix: '/api/integrations' })
await app.register(briefRoutes, { prefix: '/api/brief' })
await app.register(aiRoutes, { prefix: '/api/ai' })

// Start
const port = parseInt(process.env.API_PORT || '3001')
const host = process.env.API_HOST || '0.0.0.0'

try {
  await app.listen({ port, host })
  console.log(`API running at http://${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  await app.close()
})
