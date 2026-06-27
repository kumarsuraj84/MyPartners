'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ApprovalItem, ApprovalType } from '@/data/partners'

// ─── API shapes ────────────────────────────────────────────────────────────────

interface SuggestedAction {
  id: string
  label: string
  type: string
  detail?: string
}

interface ApiMessage {
  id: string
  subject?: string
  fromName?: string
  fromAddress: string
  summary?: string
  body: string
  priority: string
  messageCategory?: string
  receivedAt: string
  suggestedActions: SuggestedAction[]
}

interface MessagesResponse {
  messages: ApiMessage[]
  total: number
}

interface TaskStats {
  pending: number
  in_progress: number
  completed: number
  overdue: number
  commitments: number
  follow_ups: number
  waiting_for: number
}

// ─── Map message category → ApprovalType ──────────────────────────────────────

function inferApprovalType(msg: ApiMessage): ApprovalType {
  const cat = msg.messageCategory ?? ''
  if (cat === 'decision' || cat === 'commitment') return 'recommendation'
  if (cat === 'request') return 'draft_response'
  // subject heuristics
  const subj = (msg.subject ?? '').toLowerCase()
  if (subj.includes('meeting') || subj.includes('brief') || subj.includes('agenda')) return 'meeting_brief'
  if (subj.includes('follow') || subj.includes('reminder')) return 'follow_up'
  return 'draft_response'
}

function messageToApprovalItem(msg: ApiMessage): ApprovalItem {
  const receivedAt = new Date(msg.receivedAt)
  const diffMs = Date.now() - receivedAt.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const preparedAt =
    diffMins < 60
      ? `${diffMins} min ago`
      : diffMins < 1440
      ? `${Math.floor(diffMins / 60)} hour${Math.floor(diffMins / 60) > 1 ? 's' : ''} ago`
      : `${Math.floor(diffMins / 1440)} day${Math.floor(diffMins / 1440) > 1 ? 's' : ''} ago`

  const firstAction = msg.suggestedActions[0]
  const title = firstAction?.label ?? `Review: ${msg.subject ?? msg.fromName ?? 'Message'}`

  return {
    id: msg.id,
    type: inferApprovalType(msg),
    title,
    preparedBy: 'Communication Partner',
    preparedById: 'communication',
    subject: `${msg.fromName ?? msg.fromAddress}${msg.subject ? ' · ' + msg.subject : ''}`,
    preview: msg.summary ?? msg.body.slice(0, 500),
    urgency: msg.priority === 'urgent' ? 'urgent' : 'normal',
    preparedAt,
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches messages that need executive review: urgent/high priority,
 * unread, with at least one pending suggested action.
 * Falls back to an empty array on auth/network error so mock data shows instead.
 */
export function useApprovalItems() {
  return useQuery<ApprovalItem[]>({
    queryKey: ['partners', 'approvals'],
    queryFn: async () => {
      const res = await api.get<MessagesResponse>(
        '/api/messages?priority=urgent&unread=true&limit=10'
      )
      const urgent = res.messages.filter(m => m.suggestedActions.length > 0).map(messageToApprovalItem)

      // Also fetch high priority if we have fewer than 2 urgent items
      if (urgent.length < 2) {
        const res2 = await api.get<MessagesResponse>(
          '/api/messages?priority=high&unread=true&limit=5'
        )
        const high = res2.messages
          .filter(m => m.suggestedActions.length > 0 && !urgent.find(u => u.id === m.id))
          .map(messageToApprovalItem)
        return [...urgent, ...high]
      }
      return urgent
    },
    // Return empty array (not throw) so caller can fall back to mock data
    throwOnError: false,
    retry: false,
    staleTime: 60 * 1000,
  })
}

/**
 * Fetches task stats to surface real counts for the Follow-up Partner card.
 */
export function useTaskStats() {
  return useQuery<TaskStats>({
    queryKey: ['partners', 'task-stats'],
    queryFn: () => api.get<TaskStats>('/api/tasks/stats'),
    throwOnError: false,
    retry: false,
    staleTime: 60 * 1000,
  })
}
