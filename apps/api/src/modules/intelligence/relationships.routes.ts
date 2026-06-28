import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const relationshipsIntelligenceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/relationships', async (req) => {
    const { userId } = req.user as { userId: string }
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    // Get persons with recent message activity
    const persons = await prisma.person.findMany({
      where: { tenantId: userId },
      select: { id: true, name: true, email: true, role: true, company: true, description: true },
      take: 100,
    })

    // For each person, count messages from them
    const personEmails = persons.map(p => p.email).filter(Boolean) as string[]

    const [recentMessages, olderMessages, tasksFromMessages] = await Promise.all([
      prisma.message.findMany({
        where: { userId, fromAddress: { in: personEmails }, receivedAt: { gte: since30 } },
        select: { id: true, fromAddress: true, fromName: true, subject: true, receivedAt: true, isRead: true, priority: true },
      }),
      prisma.message.findMany({
        where: { userId, fromAddress: { in: personEmails }, receivedAt: { gte: since90, lt: since30 } },
        select: { id: true, fromAddress: true },
      }),
      prisma.task.findMany({
        where: { userId, category: { in: ['commitment', 'follow_up'] }, status: { not: 'completed' } },
        select: { id: true, title: true, assigneeName: true, waitingFrom: true },
      }),
    ])

    // Build per-person relationship intelligence
    const result = persons.map(person => {
      if (!person.email) return null
      const recent = recentMessages.filter(m => m.fromAddress === person.email)
      const older  = olderMessages.filter(m => m.fromAddress === person.email)
      const totalMessages = recent.length + older.length

      if (totalMessages === 0) return null  // skip people with no messages

      const urgentCount = recent.filter(m => m.priority === 'urgent' || m.priority === 'high').length
      const topics = [...new Set(recent.map(m => m.subject).filter(Boolean))].slice(0, 3) as string[]
      const lastMessage = recent.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())[0]
      const daysLastContact = lastMessage
        ? Math.floor((Date.now() - lastMessage.receivedAt.getTime()) / 86_400_000)
        : null

      // Relationship health: frequent + recent = strong, declining = needs attention
      const trend = recent.length > 0 && older.length === 0
        ? 'new'
        : recent.length >= older.length
          ? 'active'
          : recent.length === 0
            ? 'dormant'
            : 'declining'

      const openTasks = tasksFromMessages.filter(
        t => t.assigneeName?.toLowerCase().includes(person.name.toLowerCase()) ||
             t.waitingFrom?.toLowerCase().includes(person.name.toLowerCase())
      ).length

      return {
        id: person.id,
        name: person.name,
        email: person.email,
        role: person.role,
        company: person.company,
        messageCount30d: recent.length,
        messageCountTotal: totalMessages,
        urgentCount,
        recentTopics: topics,
        daysLastContact,
        trend,  // new | active | declining | dormant
        openTasks,
        healthScore: Math.min(100, Math.round(
          (recent.length * 10) +
          (trend === 'active' ? 20 : trend === 'declining' ? -20 : 0) +
          (urgentCount > 0 ? 10 : 0)
        )),
      }
    }).filter(Boolean)

    // Sort by healthScore desc, then by messageCount
    result.sort((a, b) => (b!.healthScore - a!.healthScore))

    return result.slice(0, 20)
  })
}
