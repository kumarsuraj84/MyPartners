'use client'
import { useQuery } from '@tanstack/react-query'
import { PARTNERS, APPROVAL_ITEMS, ATTENTION_ITEMS, ALL_ACTIVITIES } from '@/data/partners'
import type { ApprovalItem, AttentionItemData, PartnerActivity, Partner, WorkState, PartnerStatus } from '@/data/partners'
import { api } from '@/lib/api'
import { ExecutiveOfficeHeader } from '@/components/partners/ExecutiveOfficeHeader'
import { PartnerCard } from '@/components/partners/PartnerCard'
import { PartnerActivityFeed } from '@/components/partners/PartnerActivityFeed'
import { ApprovalCard } from '@/components/partners/ApprovalCard'
import { AttentionItem } from '@/components/partners/AttentionItem'
import { ActionExecutionTimeline } from '@/components/actions/ActionExecutionTimeline'
import { CheckCircle2 } from 'lucide-react'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

function SectionLabelWithCount({ children, count, accent }: {
  children: React.ReactNode
  count?: number
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
        {children}
      </p>
      {count !== undefined && count > 0 && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
          accent
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
    </div>
  )
}

// ── Action history ─────────────────────────────────────────────────────────

interface ActionHistoryItem {
  id: string
  actionType: string
  label: string
  status: string
  createdAt: string
  completedAt?: string
  reversible: boolean
  reversed: boolean
}

// ── Partner state API ─────────────────────────────────────────────────────────

interface ApiPartnerState {
  workState?: WorkState
  status?: PartnerStatus
  focus?: string
  needsAttention?: string
  waitingForYou?: string
  recentlyCompleted?: string[]
}

type ApiPartnersState = Record<string, ApiPartnerState>

function applyPartnerState(
  partners: Partner[],
  state: ApiPartnersState | undefined,
): Partner[] {
  if (!state) return partners
  return partners.map(p => {
    const live = state[p.id]
    if (!live) return p
    return {
      ...p,
      ...(live.workState        !== undefined && { workState:         live.workState }),
      ...(live.status           !== undefined && { status:            live.status }),
      ...(live.focus            !== undefined && { focus:             live.focus }),
      ...(live.needsAttention   !== undefined && { needsAttention:    live.needsAttention }),
      ...(live.waitingForYou    !== undefined && { waitingForYou:     live.waitingForYou }),
      ...(live.recentlyCompleted !== undefined && { recentlyCompleted: live.recentlyCompleted }),
    }
  })
}

// ── API response shapes ────────────────────────────────────────────────────────

interface ApiApproval {
  id: string
  type: string
  title: string
  preparedBy?: string
  preparedById?: string
  subject?: string
  preview?: string
  urgency?: 'urgent' | 'normal'
  preparedAt?: string
  estimatedTime?: string
}

interface ApiAttention {
  id: string
  title: string
  reason?: string
  partnerId?: string
  partnerName?: string
  actionNeeded?: string
  urgency?: 'high' | 'normal'
}

interface ApiActivity {
  id: string
  time?: string
  description?: string
  partnerId?: string
  partnerName?: string
}

interface ApiTaskStats {
  overdue: number
  commitments: number
  waiting_for: number
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function toApprovalItem(a: ApiApproval): ApprovalItem {
  return {
    id: a.id,
    type: (a.type as ApprovalItem['type']) ?? 'recommendation',
    title: a.title,
    preparedBy: a.preparedBy ?? '',
    preparedById: a.preparedById ?? '',
    subject: a.subject ?? '',
    preview: a.preview ?? '',
    urgency: a.urgency ?? 'normal',
    preparedAt: a.preparedAt ?? '',
  }
}

function toAttentionItem(a: ApiAttention): AttentionItemData {
  return {
    id: a.id,
    title: a.title,
    reason: a.reason ?? '',
    partnerId: a.partnerId ?? '',
    partnerName: a.partnerName ?? '',
    actionNeeded: a.actionNeeded ?? '',
    urgency: a.urgency ?? 'normal',
  }
}

function applyTaskStats(
  partners: Partner[],
  stats: ApiTaskStats | undefined
): Partner[] {
  if (!stats) return partners
  return partners.map(p => {
    if (p.id !== 'followup') return p
    const { overdue, commitments, waiting_for: waitingFor } = stats
    return {
      ...p,
      stats: [
        { label: 'Commitments open', value: String(commitments) },
        { label: 'Overdue', value: String(overdue) },
        { label: 'Waiting on others', value: String(waitingFor) },
      ],
      needsAttention:
        overdue > 0
          ? `${overdue} commitment${overdue > 1 ? 's are' : ' is'} overdue`
          : undefined,
      workState: overdue > 0 ? 'working' : commitments > 0 ? 'working' : 'completed',
    }
  })
}

export default function PartnersPage() {
  const { data: approvalData } = useQuery<ApiApproval[]>({
    queryKey: ['approvals'],
    queryFn: () => api.get<ApiApproval[]>('/api/approvals'),
    retry: false,
  })

  const { data: attentionData } = useQuery<ApiAttention[]>({
    queryKey: ['attention'],
    queryFn: () => api.get<ApiAttention[]>('/api/attention'),
    retry: false,
  })

  const { data: activityData } = useQuery<ApiActivity[]>({
    queryKey: ['partners-activity'],
    queryFn: () => api.get<ApiActivity[]>('/api/partners/activity'),
    retry: false,
  })

  const { data: taskStats } = useQuery<ApiTaskStats>({
    queryKey: ['task-stats'],
    queryFn: () => api.get<ApiTaskStats>('/api/partners/stats'),
    retry: false,
  })

  const { data: partnersState } = useQuery<ApiPartnersState>({
    queryKey: ['partners-state'],
    queryFn: () => api.get<ApiPartnersState>('/api/partners/state'),
    retry: false,
  })

  const { data: actionHistory = [], refetch: refetchHistory } = useQuery<ActionHistoryItem[]>({
    queryKey: ['action-history'],
    queryFn: async () => {
      try { return await api.get<ActionHistoryItem[]>('/api/actions/history') } catch { return [] }
    },
  })

  const approvalItems: ApprovalItem[] = approvalData
    ? approvalData.map(toApprovalItem)
    : APPROVAL_ITEMS

  const attentionItems: AttentionItemData[] = attentionData
    ? attentionData.map(toAttentionItem)
    : ATTENTION_ITEMS

  const _activities: PartnerActivity[] = activityData
    ? activityData.map(a => ({
        id: a.id,
        time: a.time ?? '',
        description: a.description ?? '',
        partnerId: a.partnerId ?? '',
        partnerName: a.partnerName ?? '',
      }))
    : ALL_ACTIVITIES

  const partners = applyPartnerState(applyTaskStats(PARTNERS, taskStats), partnersState)

  const liveCount = partnersState ? Object.keys(partnersState).length : 0
  const waitingPartners = partners.filter(p => p.workState === 'waiting').length
  const approvalCount   = approvalItems.length
  const attentionCount  = attentionItems.length

  return (
    <div className="animate-fade-in max-w-2xl space-y-10 pb-16">

      {/* Office Header + Summary */}
      <ExecutiveOfficeHeader />

      {/* WAITING FOR YOUR APPROVAL ───────────────────────────────── */}
      <section>
        <SectionLabelWithCount count={approvalCount} accent>
          Waiting for your Approval
        </SectionLabelWithCount>
        <div className="space-y-2">
          {approvalItems.map(item => (
            <ApprovalCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* NEEDS ATTENTION ─────────────────────────────────────────── */}
      <section>
        <SectionLabelWithCount count={attentionCount}>
          Needs Attention
        </SectionLabelWithCount>
        <div className="space-y-2">
          {attentionItems.map(item => (
            <AttentionItem key={item.id} item={item} />
          ))}
        </div>
        {attentionCount === 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-card">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Nothing needs your attention right now.</p>
          </div>
        )}
      </section>

      {/* YOUR PARTNERS ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabelWithCount count={waitingPartners}>
            Your partners
          </SectionLabelWithCount>
          {liveCount > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground/60 flex items-center gap-1 mb-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
              live
            </span>
          )}
        </div>
        <div className="space-y-2">
          {partners.map(partner => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      </section>

      {/* RECENT ACTIVITY ─────────────────────────────────────────── */}
      <section>
        <SectionLabel>Recent office activity</SectionLabel>
        <PartnerActivityFeed />
      </section>

      {/* ACTION HISTORY ──────────────────────────────────────────── */}
      <section>
        <SectionLabel>Taken care of by your Office</SectionLabel>
        <ActionExecutionTimeline
          items={actionHistory}
          onReversed={() => refetchHistory()}
        />
      </section>

    </div>
  )
}
