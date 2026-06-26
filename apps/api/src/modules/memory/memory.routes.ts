import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const memoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  /**
   * Context-aware unified search.
   * Returns structured business objects alongside notes so the executive
   * can ask "ABC Supplier" and see the organization, its people,
   * open work, and recent communication — not just note snippets.
   */
  fastify.get('/search', async (req) => {
    const { userId } = req.user as { userId: string }
    const tenantId = userId
    const { q } = req.query as { q?: string }

    if (!q?.trim()) {
      return { persons: [], organizations: [], projects: [], decisions: [], notes: [], query: '' }
    }

    const query = q.trim()
    const searchMode = 'insensitive' as const

    const [persons, organizations, projects, decisions, notes] = await Promise.all([
      prisma.person.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: query, mode: searchMode } },
            { email: { contains: query, mode: searchMode } },
            { company: { contains: query, mode: searchMode } },
            { role: { contains: query, mode: searchMode } },
          ],
        },
        include: { organization: true },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      prisma.organization.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: query, mode: searchMode } },
            { domain: { contains: query, mode: searchMode } },
            { description: { contains: query, mode: searchMode } },
          ],
        },
        include: {
          _count: { select: { persons: true, projects: true } },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      prisma.project.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: query, mode: searchMode } },
            { description: { contains: query, mode: searchMode } },
          ],
        },
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { decisions: true } },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      prisma.decision.findMany({
        where: {
          tenantId,
          OR: [
            { title: { contains: query, mode: searchMode } },
            { description: { contains: query, mode: searchMode } },
          ],
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        take: 5,
        orderBy: { madeAt: 'desc' },
      }),

      prisma.knowledgeNote.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: searchMode } },
            { content: { contains: query, mode: searchMode } },
            { tags: { has: query } },
          ],
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    // Enrich persons with open commitment / waiting-for count
    const enrichedPersons = await Promise.all(
      persons.map(async person => {
        const email = person.email
        if (!email) return { ...person, openCommitments: 0, recentMessages: 0 }

        const [openCommitments, recentMessages] = await Promise.all([
          prisma.task.count({
            where: {
              userId,
              category: { in: ['commitment', 'waiting_for'] },
              status: { not: 'completed' },
              // tasks linked via message from this person
              message: { fromAddress: email },
            },
          }),
          prisma.message.count({
            where: { userId, fromAddress: email, isArchived: false },
          }),
        ])

        return { ...person, openCommitments, recentMessages }
      }),
    )

    // Enrich organizations with open work count
    const enrichedOrgs = await Promise.all(
      organizations.map(async org => {
        const memberEmails = (await prisma.person.findMany({
          where: { tenantId, organizationId: org.id },
          select: { email: true },
        })).map(p => p.email).filter(Boolean) as string[]

        const openWork = memberEmails.length > 0
          ? await prisma.task.count({
              where: {
                userId,
                status: { not: 'completed' },
                message: { fromAddress: { in: memberEmails } },
              },
            })
          : 0

        return { ...org, openWork }
      }),
    )

    return {
      query,
      persons: enrichedPersons,
      organizations: enrichedOrgs,
      projects,
      decisions,
      notes,
    }
  })

  /**
   * What Business Memory learned from a specific message.
   * Used by Mission Control to show the extraction graph for a processed job.
   */
  fastify.get('/message/:messageId', async (req) => {
    const { userId } = req.user as { userId: string }
    const { messageId } = req.params as { messageId: string }

    // Verify message belongs to user
    await prisma.message.findFirstOrThrow({ where: { id: messageId, userId } })

    const entities = await prisma.messageEntity.findMany({
      where: { messageId },
      include: {
        person:       { include: { organization: true } },
        organization: true,
        project:      { include: { organization: true } },
        decision:     { include: { project: true } },
      },
      orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
    })

    return { messageId, entities }
  })

  /**
   * All persons in Business Memory.
   */
  fastify.get('/persons', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.person.findMany({
      where: { tenantId: userId },
      include: { organization: { select: { id: true, name: true } } },
      orderBy: [{ updatedAt: 'desc' }],
      take: 50,
    })
  })

  /**
   * All organizations in Business Memory.
   */
  fastify.get('/organizations', async (req) => {
    const { userId } = req.user as { userId: string }
    return prisma.organization.findMany({
      where: { tenantId: userId },
      include: {
        _count: { select: { persons: true, projects: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })
  })
}
