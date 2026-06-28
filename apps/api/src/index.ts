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
import { actionsRoutes } from './modules/actions/actions.routes.js'
import { memoryRoutes } from './modules/memory/memory.routes.js'
import { configRoutes } from './modules/config/config.routes.js'
import { auditRoutes } from './modules/audit/audit.routes.js'
import { signalsRoutes } from './modules/signals/signals.routes.js'
import { recommendationsRoutes } from './modules/recommendations/recommendations.routes.js'
import { adminRoutes } from './modules/admin/admin.routes.js'
import { decisionsRoutes } from './modules/decisions/decisions.routes.js'
import { partnersRoutes } from './modules/partners/partners.routes.js'
import { calendarRoutes } from './modules/calendar/calendar.routes.js'
import { waitingRoutes } from './modules/waiting/waiting.routes.js'
import { meetingBriefRoutes } from './modules/calendar/meeting-brief.routes.js'
import { prisma } from './lib/prisma.js'
// Commercial foundation: register connectors on startup
import { registerConnector } from './lib/connector.js'
import { gmailConnector } from './modules/integrations/gmail.connector.js'
import { googleCalendarConnector } from './modules/integrations/google-calendar.connector.js'
import { whatsappConnector } from './modules/integrations/whatsapp.connector.js'
import { intelligenceModule } from './modules/intelligence/index.js'
registerConnector(gmailConnector)
registerConnector(googleCalendarConnector)
registerConnector(whatsappConnector)

// ── Startup environment validation ───────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production'

function validateEnv() {
  const jwtSecret = process.env.JWT_SECRET
  if (isProd && (!jwtSecret || jwtSecret === 'dev_secret_change_me')) {
    console.error('FATAL: JWT_SECRET must be set to a secure value in production')
    process.exit(1)
  }
  if (isProd && !process.env.FRONTEND_URL) {
    console.error('FATAL: FRONTEND_URL must be set in production')
    process.exit(1)
  }
  if (!process.env.GROQ_API_KEY) {
    console.warn('WARNING: GROQ_API_KEY not set — AI features will fail at runtime')
  }
}

validateEnv()

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug') } })

// Plugins
await app.register(cors, {
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
    : (isProd ? false : ['http://localhost:4000', 'http://localhost:4002']),
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

// Health checks
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

app.get('/health/ready', async (_, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ready', db: 'ok', timestamp: new Date().toISOString() }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    reply.code(503).send({ status: 'not_ready', db: 'unreachable', error: msg })
  }
})

// Routes
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(messagesRoutes, { prefix: '/api/messages' })
await app.register(tasksRoutes, { prefix: '/api/tasks' })
await app.register(knowledgeRoutes, { prefix: '/api/knowledge' })
await app.register(integrationsRoutes, { prefix: '/api/integrations' })
await app.register(briefRoutes, { prefix: '/api/brief' })
await app.register(aiRoutes, { prefix: '/api/ai' })
await app.register(actionsRoutes, { prefix: '/api/actions' })
await app.register(memoryRoutes, { prefix: '/api/memory' })
await app.register(configRoutes, { prefix: '/api/config' })
await app.register(auditRoutes, { prefix: '/api/audit' })
await app.register(signalsRoutes, { prefix: '/api/signals' })
await app.register(adminRoutes, { prefix: '/api/admin' })
await app.register(decisionsRoutes, { prefix: '/api/decisions' })
await app.register(partnersRoutes, { prefix: '/api/partners' })
await app.register(calendarRoutes, { prefix: '/api/calendar' })
await app.register(recommendationsRoutes, { prefix: '/api/recommendations' })
await app.register(waitingRoutes, { prefix: '/api/waiting-for' })
await app.register(meetingBriefRoutes, { prefix: '/api/meeting-brief' })
await app.register(intelligenceModule, { prefix: '/api/intelligence' })

// Start
const port = parseInt(process.env.API_PORT || '4001')
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
