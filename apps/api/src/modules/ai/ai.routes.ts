import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { aiService } from '../../lib/ai.js'

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/jobs', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.aIJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 })
  })

  fastify.post('/process-message/:id', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    const message = await prisma.message.findFirstOrThrow({ where: { id, userId } })

    const job = await prisma.aIJob.create({
      data: { userId, type: 'email_processing', status: 'running', startedAt: new Date(), input: { messageId: id } },
    })

    try {
      const result = await aiService.complete({
        messages: [
          {
            role: 'system',
            content: 'Analyze this message and return JSON with: summary (string), actionItems (array), priority (urgent|high|normal|low), sentiment (positive|neutral|negative), suggestedActions (array of {label, type})',
          },
          { role: 'user', content: `From: ${message.fromName} <${message.fromAddress}>\nSubject: ${message.subject}\n\n${message.body}` },
        ],
        responseFormat: 'json',
      })

      let parsed: Record<string, unknown>
      try { parsed = JSON.parse(result) } catch { parsed = { summary: result } }

      await prisma.message.update({ where: { id }, data: { ...parsed, aiProcessed: true } as Record<string, unknown> })
      await prisma.aIJob.update({
        where: { id: job.id },
        data: { status: 'completed', completedAt: new Date(), output: parsed },
      })

      return { success: true, result: parsed }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      await prisma.aIJob.update({ where: { id: job.id }, data: { status: 'failed', completedAt: new Date(), error: errMsg } })
      throw error
    }
  })
}
