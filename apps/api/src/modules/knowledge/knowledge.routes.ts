import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

const CreateNoteSchema = z.object({
  type: z.enum(['note', 'meeting', 'decision', 'vendor', 'project', 'contact']).default('note'),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
})

export const knowledgeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (req) => {
    const { userId } = req.user as { userId: string }
    const { type, search, tag } = req.query as { type?: string; search?: string; tag?: string }

    const where: Record<string, unknown> = { userId }
    if (type) where.type = type
    if (tag) where.tags = { has: tag }
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ]

    return prisma.knowledgeNote.findMany({ where, orderBy: { updatedAt: 'desc' } })
  })

  fastify.post('/', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const data = CreateNoteSchema.parse(req.body)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const note = await prisma.knowledgeNote.create({ data: { ...data, userId, metadata: data.metadata as unknown as any } })
    reply.code(201)
    return note
  })

  fastify.patch('/:id', async (req) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    const data = CreateNoteSchema.partial().parse(req.body)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prisma.knowledgeNote.update({ where: { id, userId }, data: { ...data, metadata: data.metadata as unknown as any } })
  })

  fastify.delete('/:id', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }
    await prisma.knowledgeNote.delete({ where: { id, userId } })
    reply.code(204)
  })
}
