import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

const LoginSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Dev-mode login (no password for v1 — production would use OAuth)
  fastify.post<{ Body: z.infer<typeof LoginSchema> }>('/login', async (req, reply) => {
    const { email, name } = LoginSchema.parse(req.body)

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({ data: { email, name: name ?? email.split('@')[0] } })
    }

    const token = fastify.jwt.sign({ userId: user.id, email: user.email }, { expiresIn: '7d' })
    return { token, user }
  })

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (req) => {
    const { userId } = req.user as { userId: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    return user
  })
}
