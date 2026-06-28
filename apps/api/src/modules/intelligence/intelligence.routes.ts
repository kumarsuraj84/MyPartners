import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const intelligenceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /api/intelligence/preferences
  fastify.get('/preferences', async (req) => {
    const { userId } = req.user as { userId: string }

    // Fetch last 90 days of decisions for analysis
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const [decisions, signals, tasks] = await Promise.all([
      prisma.decision.findMany({
        where: { userId, createdAt: { gte: since90 } },
        select: { id: true, category: true, escalation: true, status: true, decidedAt: true, createdAt: true },
      }),
      prisma.signal.findMany({
        where: { userId, createdAt: { gte: since90 } },
        select: { id: true, type: true, urgency: true, isDismissed: true, isResolved: true, createdAt: true, updatedAt: true },
      }),
      prisma.task.findMany({
        where: { userId, createdAt: { gte: since90 } },
        select: { id: true, category: true, priority: true, status: true, dueDate: true, completedAt: true, createdAt: true },
      }),
    ])

    // Decision velocity: avg hours from createdAt to decidedAt per category
    const decisionVelocity: Record<string, { avg: number; count: number }> = {}
    for (const d of decisions) {
      if (d.status !== 'pending' && d.decidedAt) {
        const hours = (d.decidedAt.getTime() - d.createdAt.getTime()) / 3_600_000
        const cat = d.category
        if (!decisionVelocity[cat]) decisionVelocity[cat] = { avg: 0, count: 0 }
        decisionVelocity[cat].count++
        decisionVelocity[cat].avg = (decisionVelocity[cat].avg * (decisionVelocity[cat].count - 1) + hours) / decisionVelocity[cat].count
      }
    }

    // Approval rate per escalation level
    const byEscalation: Record<string, { approved: number; deferred: number; changes: number; total: number }> = {}
    for (const d of decisions.filter(d => d.status !== 'pending')) {
      const esc = d.escalation
      if (!byEscalation[esc]) byEscalation[esc] = { approved: 0, deferred: 0, changes: 0, total: 0 }
      byEscalation[esc].total++
      if (d.status === 'approved') byEscalation[esc].approved++
      else if (d.status === 'deferred') byEscalation[esc].deferred++
      else if (d.status === 'changes_requested') byEscalation[esc].changes++
    }

    // Signal response rate (resolved vs dismissed)
    const signalStats = {
      total: signals.length,
      resolved: signals.filter(s => s.isResolved).length,
      dismissed: signals.filter(s => s.isDismissed && !s.isResolved).length,
      pending: signals.filter(s => !s.isDismissed && !s.isResolved).length,
      criticalResolutionRate: (() => {
        const critical = signals.filter(s => s.urgency === 'critical')
        if (!critical.length) return null
        return Math.round(critical.filter(s => s.isResolved).length / critical.length * 100)
      })(),
    }

    // Task completion rate by category
    const taskStats: Record<string, { completed: number; total: number; overdueRate: number }> = {}
    for (const t of tasks) {
      const cat = t.category
      if (!taskStats[cat]) taskStats[cat] = { completed: 0, total: 0, overdueRate: 0 }
      taskStats[cat].total++
      if (t.status === 'completed') taskStats[cat].completed++
      if (t.dueDate && t.dueDate < new Date() && t.status !== 'completed') taskStats[cat].overdueRate++
    }
    for (const cat of Object.keys(taskStats)) {
      const t = taskStats[cat]
      t.overdueRate = t.total > 0 ? Math.round(t.overdueRate / t.total * 100) : 0
    }

    // Derive insight labels
    const insights: { id: string; insight: string; detail: string; category: string }[] = []

    const fastestCategory = Object.entries(decisionVelocity).sort((a, b) => a[1].avg - b[1].avg)[0]
    if (fastestCategory) {
      insights.push({
        id: 'decision-velocity',
        insight: `You decide fastest on ${fastestCategory[0]} decisions`,
        detail: `Average ${Math.round(fastestCategory[1].avg)}h to decide. Your office will prioritise these first.`,
        category: 'decisions',
      })
    }

    const commitmentStats = taskStats['commitment']
    if (commitmentStats && commitmentStats.total >= 3) {
      const rate = Math.round(commitmentStats.completed / commitmentStats.total * 100)
      insights.push({
        id: 'commitment-rate',
        insight: `${rate}% commitment follow-through rate`,
        detail: rate >= 80
          ? 'Excellent — your office will maintain current tracking cadence.'
          : 'Your office will increase proactive nudges on commitments.',
        category: 'commitments',
      })
    }

    if (signalStats.criticalResolutionRate !== null) {
      insights.push({
        id: 'signal-response',
        insight: `${signalStats.criticalResolutionRate}% of critical items resolved`,
        detail: 'Your office uses this to calibrate how urgently to surface new signals.',
        category: 'attention',
      })
    }

    return {
      period: '90 days',
      decisionVelocity,
      byEscalation,
      signalStats,
      taskStats,
      insights,
      totalDecisions: decisions.length,
      totalSignals: signals.length,
      totalTasks: tasks.length,
    }
  })
}
