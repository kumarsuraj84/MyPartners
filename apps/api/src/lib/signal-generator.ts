/**
 * Signal Generator — deterministic rules over Business Memory.
 *
 * Signals are generated without calling AI. Every rule is a plain database query
 * against existing data. New rules are added here; routes never contain rule logic.
 *
 * Idempotent: creating signals for the same entity+type is a no-op unless the
 * previous signal was resolved or dismissed (in which case it is reactivated).
 */

import { prisma } from './prisma.js'
import { getConfig } from './config.js'

interface RawSignal {
  userId: string
  type: string
  title: string
  reason: string
  businessImpact: string
  suggestedAction: string
  urgency: 'critical' | 'high' | 'normal'
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export async function generateSignals(userId: string): Promise<{ created: number; reactivated: number }> {
  const [
    urgentUnreadHours,
    waitingForDays,
    followUpGraceDays,
  ] = await Promise.all([
    getConfig<number>(userId, 'reminder_policies', 'urgentUnreadHours').then(v => v ?? 4),
    getConfig<number>(userId, 'reminder_policies', 'waitingForReminderDays').then(v => v ?? 5),
    getConfig<number>(userId, 'reminder_policies', 'followUpAfterDays').then(v => v ?? 3),
  ])

  const raw: RawSignal[] = []

  // ── Rule 1: Overdue commitments ───────────────────────────────────────────
  const overdueCommitments = await prisma.task.findMany({
    where: {
      userId,
      category: 'commitment',
      status: { notIn: ['completed', 'cancelled'] },
      dueDate: { lt: new Date() },
    },
    take: 5,
    orderBy: { dueDate: 'asc' },
  })

  for (const task of overdueCommitments) {
    const dueDateStr = task.dueDate ? task.dueDate.toDateString() : 'an earlier date'
    raw.push({
      userId,
      type: 'overdue_commitment',
      title: `Overdue commitment: ${task.title}`,
      reason: `You committed to "${task.title}" by ${dueDateStr} and it hasn't been marked complete.`,
      businessImpact: 'Missing commitments damages trust and may block work others are depending on.',
      suggestedAction: 'Complete it, reschedule with a new date, or communicate a delay to relevant parties.',
      urgency: 'high',
      entityType: 'task',
      entityId: task.id,
      metadata: { dueDate: task.dueDate?.toISOString(), assigneeName: task.assigneeName },
    })
  }

  // ── Rule 2: Urgent messages unacknowledged for too long ───────────────────
  const urgentCutoff = new Date(Date.now() - urgentUnreadHours * 60 * 60 * 1000)
  const urgentUnread = await prisma.message.findMany({
    where: {
      userId,
      priority: 'urgent',
      isRead: false,
      isArchived: false,
      receivedAt: { lt: urgentCutoff },
    },
    take: 3,
    orderBy: { receivedAt: 'asc' },
  })

  for (const msg of urgentUnread) {
    raw.push({
      userId,
      type: 'unacknowledged_urgent',
      title: `Urgent message unread: ${msg.subject ?? `from ${msg.fromName ?? msg.fromAddress}`}`,
      reason: `This message was marked urgent and has been sitting unread for more than ${urgentUnreadHours} hours.`,
      businessImpact: 'Leaving urgent messages unacknowledged signals inattention and may delay critical decisions.',
      suggestedAction: 'Open and respond, or delegate to someone who can act immediately.',
      urgency: 'critical',
      entityType: 'message',
      entityId: msg.id,
      metadata: { subject: msg.subject, fromName: msg.fromName, fromAddress: msg.fromAddress },
    })
  }

  // ── Rule 3: Waiting-for items past reminder threshold ─────────────────────
  const waitingCutoff = new Date(Date.now() - waitingForDays * 24 * 60 * 60 * 1000)
  const overdueWaiting = await prisma.task.findMany({
    where: {
      userId,
      category: 'waiting_for',
      status: { not: 'completed' },
      createdAt: { lt: waitingCutoff },
    },
    take: 5,
    orderBy: { createdAt: 'asc' },
  })

  for (const task of overdueWaiting) {
    const from = task.waitingFrom ?? 'the other party'
    raw.push({
      userId,
      type: 'waiting_overdue',
      title: `No response after ${waitingForDays} days: ${task.title}`,
      reason: `You've been waiting on ${from} for more than ${waitingForDays} days with no update.`,
      businessImpact: 'Unresolved waiting items silently stall work and create invisible blockers.',
      suggestedAction: `Send a short follow-up to ${from} to check the status.`,
      urgency: 'normal',
      entityType: 'task',
      entityId: task.id,
      metadata: { waitingFrom: task.waitingFrom, daysWaiting: waitingForDays },
    })
  }

  // ── Rule 4: Overdue follow-ups ────────────────────────────────────────────
  const followUpCutoff = new Date(Date.now() - followUpGraceDays * 24 * 60 * 60 * 1000)
  const overdueFollowUps = await prisma.task.findMany({
    where: {
      userId,
      category: 'follow_up',
      status: { not: 'completed' },
      dueDate: { lt: new Date() },
      createdAt: { lt: followUpCutoff },
    },
    take: 3,
    orderBy: { dueDate: 'asc' },
  })

  for (const task of overdueFollowUps) {
    raw.push({
      userId,
      type: 'follow_up_overdue',
      title: `Follow-up slipping: ${task.title}`,
      reason: `This follow-up was due ${task.dueDate?.toDateString() ?? 'earlier'} and has not been resolved.`,
      businessImpact: 'Overdue follow-ups mean commitments can fall through without anyone noticing.',
      suggestedAction: 'Check whether this has been resolved and mark it complete, or reschedule.',
      urgency: 'normal',
      entityType: 'task',
      entityId: task.id,
    })
  }

  // ── Upsert: create new, reactivate dismissed/resolved ────────────────────
  let created = 0
  let reactivated = 0

  for (const sig of raw) {
    const existing = sig.entityId
      ? await prisma.signal.findFirst({
          where: { userId: sig.userId, type: sig.type, entityId: sig.entityId },
        })
      : null

    if (!existing) {
      await prisma.signal.create({ data: sig as never })
      created++
    } else if (existing.isDismissed || existing.isResolved) {
      await prisma.signal.update({
        where: { id: existing.id },
        data: { isDismissed: false, isResolved: false, snoozedUntil: null },
      })
      reactivated++
    }
    // If already active, leave untouched
  }

  // ── Auto-resolve signals whose underlying issue is now fixed ──────────────
  await resolveStaleSignals(userId)

  return { created, reactivated }
}

async function resolveStaleSignals(userId: string): Promise<void> {
  // Resolve task-based signals when the task is completed or cancelled
  const closedTaskIds = (
    await prisma.task.findMany({
      where: { userId, status: { in: ['completed', 'cancelled'] } },
      select: { id: true },
    })
  ).map(t => t.id)

  if (closedTaskIds.length > 0) {
    await prisma.signal.updateMany({
      where: { userId, entityType: 'task', entityId: { in: closedTaskIds }, isResolved: false },
      data: { isResolved: true },
    })
  }

  // Resolve message signals when the message is read or archived
  const handledMessageIds = (
    await prisma.message.findMany({
      where: { userId, OR: [{ isRead: true }, { isArchived: true }] },
      select: { id: true },
    })
  ).map(m => m.id)

  if (handledMessageIds.length > 0) {
    await prisma.signal.updateMany({
      where: { userId, entityType: 'message', entityId: { in: handledMessageIds }, isResolved: false },
      data: { isResolved: true },
    })
  }
}
