// Meeting Brief Routes — returns a prepared meeting brief for a calendar event.
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

interface CalendarEventMetadata {
  eventId?: string
  title?: string
  startTime?: string | null
  endTime?: string | null
  attendees?: string[]
  location?: string | null
  description?: string | null
}

export const meetingBriefRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/meeting-brief/:id
  fastify.get('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { id } = req.params as { id: string }

    const job = await prisma.aIJob.findFirst({
      where: { id, userId, type: 'calendar_event' },
    })

    if (!job) {
      return reply.code(404).send({ error: 'Meeting not found' })
    }

    const metadata = (job.metadata ?? {}) as CalendarEventMetadata
    const rawAttendees: string[] = metadata.attendees ?? []

    // Separate likely emails from names
    const attendeeEmails: string[] = rawAttendees.filter((a) => a.includes('@'))
    const attendeeNames: string[] = rawAttendees.filter((a) => !a.includes('@'))

    // Look up Person records for each attendee (cap at 5)
    const personLookups = rawAttendees.slice(0, 5).map(async (attendee) => {
      const isEmail = attendee.includes('@')
      const person = await prisma.person.findFirst({
        where: {
          tenantId: userId,
          ...(isEmail
            ? { email: attendee }
            : { name: { contains: attendee, mode: 'insensitive' } }),
        },
        select: { name: true, email: true, role: true, company: true, description: true },
      })

      return {
        name: person?.name ?? attendee,
        email: person?.email ?? (isEmail ? attendee : null),
        role: person?.role ?? null,
        company: person?.company ?? null,
        hasContext: person !== null,
      }
    })

    const attendees = await Promise.all(personLookups)

    // Find recent messages from attendee emails (last 14 days)
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const recentMessages =
      attendeeEmails.length > 0
        ? await prisma.message.findMany({
            where: {
              userId,
              fromAddress: { in: attendeeEmails },
              receivedAt: { gte: cutoff },
            },
            select: {
              id: true,
              fromName: true,
              fromAddress: true,
              subject: true,
              summary: true,
              receivedAt: true,
            },
            orderBy: { receivedAt: 'desc' },
            take: 5,
          })
        : []

    return {
      id: job.id,
      title: metadata.title ?? 'Untitled Event',
      startTime: metadata.startTime ?? null,
      endTime: metadata.endTime ?? null,
      location: metadata.location ?? null,
      attendees,
      recentMessages: recentMessages.map((m) => ({
        id: m.id,
        fromName: m.fromName,
        subject: m.subject,
        summary: m.summary,
        receivedAt: m.receivedAt,
      })),
      context: metadata.description ?? null,
      preparedBy: 'Meeting Partner',
      preparedAt: new Date().toISOString(),
    }
  })
}
