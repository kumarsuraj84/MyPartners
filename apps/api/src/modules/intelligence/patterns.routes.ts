import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const patternsIntelligenceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/patterns', async (req) => {
    const { userId } = req.user as { userId: string }
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [messages, tasks, meetingJobs] = await Promise.all([
      prisma.message.findMany({
        where: { userId, receivedAt: { gte: since30 } },
        select: { id: true, receivedAt: true, isRead: true, priority: true, messageCategory: true },
      }),
      prisma.task.findMany({
        where: { userId, createdAt: { gte: since30 } },
        select: { id: true, category: true, status: true, dueDate: true, completedAt: true, createdAt: true, priority: true },
      }),
      prisma.aIJob.findMany({
        where: { userId, type: 'calendar_event', createdAt: { gte: since30 } },
        select: { id: true, metadata: true, createdAt: true },
      }),
    ])

    // Message volume by hour of day (0-23)
    const messagesByHour: number[] = Array(24).fill(0)
    for (const m of messages) {
      messagesByHour[m.receivedAt.getHours()]++
    }
    const peakHour = messagesByHour.indexOf(Math.max(...messagesByHour))
    const peakHourLabel = peakHour < 12 ? `${peakHour || 12}am` : peakHour === 12 ? '12pm' : `${peakHour - 12}pm`

    // Task completion velocity: avg days from created to completed
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedAt)
    const avgCompletionDays = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.completedAt!.getTime() - t.createdAt.getTime()) / 86_400_000, 0) / completedTasks.length
      : null

    // Overdue rate
    const dueTasks = tasks.filter(t => t.dueDate)
    const overdueTasks = dueTasks.filter(t => t.dueDate! < new Date() && t.status !== 'completed')
    const overdueRate = dueTasks.length > 0 ? Math.round(overdueTasks.length / dueTasks.length * 100) : 0

    // Message priority breakdown
    const priorityBreakdown = {
      urgent: messages.filter(m => m.priority === 'urgent').length,
      high:   messages.filter(m => m.priority === 'high').length,
      normal: messages.filter(m => m.priority === 'normal').length,
      low:    messages.filter(m => m.priority === 'low').length,
    }

    // Meeting frequency (calendar events per week)
    const weeksInRange = 30 / 7
    const meetingsPerWeek = Math.round(meetingJobs.length / weeksInRange * 10) / 10

    // Most common task categories
    const taskCategoryCount: Record<string, number> = {}
    for (const t of tasks) {
      taskCategoryCount[t.category] = (taskCategoryCount[t.category] ?? 0) + 1
    }

    // Build insight cards
    const patterns: { id: string; pattern: string; detail: string; value: string; trend: 'positive' | 'neutral' | 'attention' }[] = []

    patterns.push({
      id: 'peak-hour',
      pattern: 'Peak communication hour',
      detail: `Most messages arrive around ${peakHourLabel}. Your office front-loads preparation before this window.`,
      value: peakHourLabel,
      trend: 'neutral',
    })

    if (avgCompletionDays !== null) {
      patterns.push({
        id: 'completion-velocity',
        pattern: 'Average task completion time',
        detail: avgCompletionDays < 2
          ? 'You resolve tasks quickly. Your office prioritises same-day items.'
          : 'Your office will escalate items approaching the average threshold.',
        value: `${Math.round(avgCompletionDays * 10) / 10} days`,
        trend: avgCompletionDays < 3 ? 'positive' : 'attention',
      })
    }

    patterns.push({
      id: 'overdue-rate',
      pattern: 'Task overdue rate',
      detail: overdueRate < 15
        ? 'Well managed — your office maintains current tracking frequency.'
        : 'Your office will increase proactive reminders to reduce overdue items.',
      value: `${overdueRate}%`,
      trend: overdueRate < 15 ? 'positive' : 'attention',
    })

    if (meetingsPerWeek > 0) {
      patterns.push({
        id: 'meeting-cadence',
        pattern: 'Meeting cadence',
        detail: 'Your office prepares a brief before each scheduled meeting.',
        value: `${meetingsPerWeek}/week`,
        trend: 'neutral',
      })
    }

    return {
      period: '30 days',
      messagesByHour,
      peakHour,
      peakHourLabel,
      avgCompletionDays,
      overdueRate,
      priorityBreakdown,
      meetingsPerWeek,
      taskCategoryCount,
      patterns,
    }
  })
}
