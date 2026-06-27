import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { getPermissions } from '../../lib/permissions.js'
import { getPlan } from '../../lib/plans.js'

const LoginSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Dev-mode login (no password for v1 — production replaces this with OAuth)
  fastify.post<{ Body: z.infer<typeof LoginSchema> }>('/login', async (req, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(404).send({ error: 'Not found' })
    }

    const { email, name } = LoginSchema.parse(req.body)

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: { email, name: name ?? email.split('@')[0], role: 'owner', plan: 'free' },
      })
    }

    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      { expiresIn: '7d' },
    )
    return { token, user }
  })

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (req) => {
    const { userId } = req.user as { userId: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    // Attach computed permission and plan info for the frontend
    return {
      ...user,
      permissions: getPermissions(user.role),
      planDefinition: getPlan(user.plan),
    }
  })
}
