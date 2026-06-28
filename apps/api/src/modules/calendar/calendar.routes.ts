// Calendar Routes — serves today's events from synced Google Calendar data.
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

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function formatDuration(startIso: string | null | undefined, endIso: string | null | undefined): string {
  if (!startIso || !endIso) return ''
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (diffMs <= 0) return ''
  const totalMinutes = Math.round(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

export const calendarRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /api/calendar/today — returns today's calendar events for the authenticated user
  fastify.get('/today', async (req) => {
    const { userId } = req.user as { userId: string }

    const now = new Date()
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))

    const jobs = await prisma.aIJob.findMany({
      where: {
        userId,
        type: 'calendar_event',
        createdAt: { gte: startOfDay },
      },
      orderBy: { createdAt: 'asc' },
    })

    const events = jobs.map((job) => {
      const meta = (job.metadata ?? {}) as CalendarEventMetadata
      const context = meta.description
        ? meta.description.slice(0, 200)
        : null

      return {
        id: job.id,
        title: meta.title ?? 'Untitled Event',
        time: formatTime(meta.startTime),
        duration: formatDuration(meta.startTime, meta.endTime),
        attendees: meta.attendees ?? [],
        location: meta.location ?? null,
        context,
        hasBrief: false,
        preparedBy: 'Meeting Partner',
      }
    })

    return { events }
  })
}
