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
          _count: { select: { businessDecisions: true } },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      prisma.businessDecision.findMany({
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

    // Enrich persons in a single batch: group task and message counts by sender address
    const personEmails = persons.map(p => p.email).filter(Boolean) as string[]

    const [personTaskCounts, personMessageCounts, orgPersonMap] = await Promise.all([
      personEmails.length > 0
        ? prisma.task.groupBy({
            by: ['messageId'],
            where: {
              userId,
              category: { in: ['commitment', 'waiting_for'] },
              status: { not: 'completed' },
              message: { fromAddress: { in: personEmails } },
            },
            _count: { messageId: true },
          }).then(async () =>
            // groupBy on a joined field isn't supported — fall back to a single count per email
            // but execute all in parallel rather than sequentially
            Object.fromEntries(
              await Promise.all(personEmails.map(async email => [
                email,
                await prisma.task.count({
                  where: {
                    userId,
                    category: { in: ['commitment', 'waiting_for'] },
                    status: { not: 'completed' },
                    message: { fromAddress: email },
                  },
                }),
              ]))
            )
          )
        : {} as Record<string, number>,
      personEmails.length > 0
        ? prisma.message.groupBy({
            by: ['fromAddress'],
            where: { userId, fromAddress: { in: personEmails }, isArchived: false },
            _count: { id: true },
          }).then(rows => Object.fromEntries(rows.map(r => [r.fromAddress, r._count.id])))
        : {} as Record<string, number>,
      organizations.length > 0
        ? prisma.person.findMany({
            where: { tenantId, organizationId: { in: organizations.map(o => o.id) } },
            select: { email: true, organizationId: true },
          })
        : [],
    ])

    const enrichedPersons = persons.map(person => ({
      ...person,
      openCommitments: person.email ? (personTaskCounts[person.email] ?? 0) : 0,
      recentMessages: person.email ? (personMessageCounts[person.email] ?? 0) : 0,
    }))

    // Batch org enrichment: we already have all member emails per org
    const orgMemberEmails: Record<string, string[]> = {}
    for (const p of orgPersonMap) {
      if (p.organizationId && p.email) {
        orgMemberEmails[p.organizationId] ??= []
        orgMemberEmails[p.organizationId].push(p.email)
      }
    }

    const orgWorkCounts = await Promise.all(
      organizations.map(async org => {
        const emails = orgMemberEmails[org.id] ?? []
        if (emails.length === 0) return 0
        return prisma.task.count({
          where: { userId, status: { not: 'completed' }, message: { fromAddress: { in: emails } } },
        })
      })
    )

    const enrichedOrgs = organizations.map((org, i) => ({ ...org, openWork: orgWorkCounts[i] ?? 0 }))

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
        businessDecision: { include: { project: true } },
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
