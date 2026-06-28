'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
  MOCK_PERSONS,
  MOCK_ORGANIZATIONS,
  MOCK_PROJECTS,
  MOCK_DECISIONS,
  type MemoryPerson,
  type MemoryOrganization,
  type MemoryProject,
  type MemoryDecision,
} from '@/data/mockMemory'

// ─── API response shapes ───────────────────────────────────────────────────────

interface ApiPerson {
  id: string
  name: string
  role: string | null
  company: string | null
  email: string | null
  updatedAt: string
  relationship: string | null
  notes: string | null
  organizationId: string | null
  organization?: { id: string; name: string } | null
}

interface ApiOrganization {
  id: string
  name: string
  domain: string | null
  type: string | null
  description: string | null
  updatedAt: string
  _count: { persons: number; projects: number }
}

// ─── Normalise API → MemoryPerson ──────────────────────────────────────────────

function normalisePersons(apiPersons: ApiPerson[]): MemoryPerson[] {
  return apiPersons.map(p => ({
    id: p.id,
    name: p.name,
    role: p.role ?? '',
    company: p.company ?? (p.organization?.name ?? 'External'),
    email: p.email ?? '',
    lastContact: new Date(p.updatedAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short',
    }),
    relationship: p.relationship ?? '',
    notes: p.notes ?? '',
    linkedOrgId: p.organizationId ?? undefined,
  }))
}

// ─── Normalise API → MemoryOrganization ───────────────────────────────────────

function normaliseOrganizations(apiOrgs: ApiOrganization[]): MemoryOrganization[] {
  const VALID_TYPES = ['investor', 'client', 'partner', 'vendor'] as const
  type OrgType = typeof VALID_TYPES[number]
  return apiOrgs.map(o => ({
    id: o.id,
    name: o.name,
    domain: o.domain ?? '',
    type: (VALID_TYPES.includes(o.type as OrgType) ? o.type : 'vendor') as OrgType,
    contactCount: o._count.persons,
    notes: o.description ?? '',
    linkedProjects: [],
  }))
}
import {
  User,
  Building2,
  FolderOpen,
  Scale,
  StickyNote,
  Search,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { ExecutivePatternCard, type ExecutivePattern } from '@/components/intelligence/ExecutivePatternCard'
import { PreferenceInsightCard, type PreferenceInsight } from '@/components/intelligence/PreferenceInsightCard'
import { RelationshipIntelligenceCard, type RelationshipIntelligence } from '@/components/intelligence/RelationshipIntelligenceCard'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'people' | 'organisations' | 'projects' | 'decisions' | 'notes' | 'intelligence'

// ─── Tab config ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'people',        label: 'People',        icon: User },
  { key: 'organisations', label: 'Organisations',  icon: Building2 },
  { key: 'projects',      label: 'Projects',       icon: FolderOpen },
  { key: 'decisions',     label: 'Decisions',      icon: Scale },
  { key: 'notes',         label: 'Notes',          icon: StickyNote },
  { key: 'intelligence',  label: 'Insights',       icon: Sparkles },
]

// ─── Badge styles ──────────────────────────────────────────────────────────────

const ORG_TYPE_STYLES: Record<string, { badge: string; strip: string }> = {
  investor: {
    badge: 'bg-blue-50 text-blue-600 border-blue-200',
    strip: 'border-l-blue-400',
  },
  client: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    strip: 'border-l-emerald-400',
  },
  partner: {
    badge: 'bg-violet-50 text-violet-600 border-violet-200',
    strip: 'border-l-violet-400',
  },
  vendor: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    strip: 'border-l-amber-400',
  },
}

const PROJECT_STATUS_STYLES: Record<string, { badge: string; strip: string; dot: string }> = {
  active: {
    badge: 'bg-green-50 text-green-700 border-green-200',
    strip: 'border-l-green-400',
    dot: 'bg-green-400',
  },
  paused: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    strip: 'border-l-amber-400',
    dot: 'bg-amber-400',
  },
  closed: {
    badge: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    strip: 'border-l-zinc-300',
    dot: 'bg-zinc-400',
  },
}

// ─── EntityChip ────────────────────────────────────────────────────────────────

function EntityChip({
  type,
  label,
}: {
  type: 'person' | 'org' | 'project' | 'decision'
  label: string
}) {
  const iconMap = { person: User, org: Building2, project: FolderOpen, decision: Scale }
  const colorMap = {
    person:   'text-primary bg-primary/8 border-primary/20',
    org:      'text-blue-600 bg-blue-50 border-blue-200',
    project:  'text-violet-600 bg-violet-50 border-violet-200',
    decision: 'text-amber-700 bg-amber-50 border-amber-200',
  }
  const Icon = iconMap[type]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
        colorMap[type],
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  )
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary flex-shrink-0 select-none">
      {initials}
    </div>
  )
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

// ─── People tab ────────────────────────────────────────────────────────────────

function PeopleTab({ search }: { search: string }) {
  const { data: apiData, isLoading, isError } = useQuery<ApiPerson[]>({
    queryKey: ['memory', 'persons'],
    queryFn: async () => {
      const res = await fetch('/api/memory/persons')
      if (!res.ok) throw new Error('unavailable')
      return res.json()
    },
    retry: false,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card px-4 py-5">
        <p className="text-xs text-muted-foreground">Your office is retrieving this information.</p>
      </div>
    )
  }

  const source = isError || !apiData ? MOCK_PERSONS : normalisePersons(apiData)

  const items = source.filter(
    p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase()),
  )

  if (!items.length)
    return <EmptyState label="No people match that search." />

  const internal = items.filter(p => p.company === 'Internal')
  const external = items.filter(p => p.company !== 'Internal')

  return (
    <div className="space-y-6">
      {external.length > 0 && (
        <div>
          <SectionLabel>External</SectionLabel>
          <div className="space-y-2">
            {external.map(p => <PersonCard key={p.id} person={p} />)}
          </div>
        </div>
      )}
      {internal.length > 0 && (
        <div>
          <SectionLabel>Your team</SectionLabel>
          <div className="space-y-2">
            {internal.map(p => <PersonCard key={p.id} person={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function PersonCard({ person: p, orgName }: { person: MemoryPerson; orgName?: string }) {
  const linkedOrgName = orgName ?? (p.linkedOrgId
    ? MOCK_ORGANIZATIONS.find(o => o.id === p.linkedOrgId)?.name
    : undefined)

  return (
    <div className="rounded-xl border bg-card overflow-hidden border-l-[3px] border-l-primary/30">
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <Avatar name={p.name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <EntityChip type="person" label={p.name} />
              {linkedOrgName && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-default">
                  <ArrowUpRight className="h-2.5 w-2.5" />
                  {linkedOrgName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {p.role}
              {p.company !== 'Internal' ? ` · ${p.company}` : ''}
            </p>
            <p className="text-xs text-foreground/70 mt-2 leading-relaxed">
              {p.relationship}
            </p>
            {p.notes && (
              <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed border-t border-border/50 pt-2">
                {p.notes}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/50 mt-2 font-medium tracking-wide uppercase">
              Last contact: {p.lastContact}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Organisations tab ────────────────────────────────────────────────────────

function OrganisationsTab({ search }: { search: string }) {
  const { data: apiData, isLoading, isError } = useQuery<ApiOrganization[]>({
    queryKey: ['memory', 'organizations'],
    queryFn: async () => {
      const res = await fetch('/api/memory/organizations')
      if (!res.ok) throw new Error('unavailable')
      return res.json()
    },
    retry: false,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card px-4 py-5">
        <p className="text-xs text-muted-foreground">Your office is retrieving this information.</p>
      </div>
    )
  }

  const source = isError || !apiData ? MOCK_ORGANIZATIONS : normaliseOrganizations(apiData)

  const items = source.filter(
    o =>
      !search ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.type.toLowerCase().includes(search.toLowerCase()),
  )

  if (!items.length)
    return <EmptyState label="No organisations match that search." />

  return (
    <div className="space-y-2">
      {items.map(o => <OrgCard key={o.id} org={o} />)}
    </div>
  )
}

function OrgCard({ org: o }: { org: MemoryOrganization }) {
  const style = ORG_TYPE_STYLES[o.type] ?? ORG_TYPE_STYLES.vendor
  const linkedProjects = MOCK_PROJECTS.filter(p =>
    o.linkedProjects.includes(p.id),
  )

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden border-l-[3px]',
        style.strip,
      )}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{o.name}</p>
              <span
                className={cn(
                  'inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                  style.badge,
                )}
              >
                {o.type.charAt(0).toUpperCase() + o.type.slice(1)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {o.domain} · {o.contactCount} contact{o.contactCount !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-foreground/70 mt-2 leading-relaxed">{o.notes}</p>
            {linkedProjects.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1.5">
                {linkedProjects.map(p => (
                  <EntityChip key={p.id} type="project" label={p.name} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── API shapes for search results ────────────────────────────────────────────

interface ApiProject {
  id: string
  name: string
  status: string | null
  description: string | null
  updatedAt: string
  organization?: { id: string; name: string } | null
  _count?: { decisions: number }
}

interface ApiDecision {
  id: string
  title: string
  description: string | null
  madeAt: string
  outcome: string | null
  project?: { id: string; name: string } | null
}

interface ApiSearchResult {
  projects: ApiProject[]
  decisions: ApiDecision[]
}

function normaliseProjects(apiProjects: ApiProject[]): MemoryProject[] {
  const VALID_STATUS = ['active', 'paused', 'closed'] as const
  type Status = typeof VALID_STATUS[number]
  return apiProjects.map(p => ({
    id: p.id,
    name: p.name,
    status: (VALID_STATUS.includes(p.status as Status) ? p.status : 'active') as Status,
    owner: p.organization?.name ?? 'Unassigned',
    notes: p.description ?? '',
    linkedOrgId: p.organization?.id,
    decisions: [],
  }))
}

function normaliseDecisions(apiDecisions: ApiDecision[]): MemoryDecision[] {
  return apiDecisions.map(d => ({
    id: d.id,
    title: d.title,
    date: new Date(d.madeAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    outcome: d.outcome ?? d.description ?? '',
    linkedProject: d.project?.id,
    madeBy: d.project?.name ?? 'Unrecorded',
    context: '',
  }))
}

// ─── Projects tab ──────────────────────────────────────────────────────────────

function ProjectsTab({ search }: { search: string }) {
  const { data: searchData, isLoading } = useQuery<ApiSearchResult>({
    queryKey: ['memory', 'search', 'projects', search],
    queryFn: async () => {
      if (!search.trim()) return { projects: [], decisions: [] }
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(search)}`)
      if (!res.ok) throw new Error('unavailable')
      return res.json()
    },
    enabled: !!search.trim(),
    retry: false,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card px-4 py-5">
        <p className="text-xs text-muted-foreground">Your office is retrieving this information.</p>
      </div>
    )
  }

  // If we have live search results, show them; otherwise filter mock data
  const items = (search.trim() && searchData?.projects?.length)
    ? normaliseProjects(searchData.projects)
    : MOCK_PROJECTS.filter(
        p =>
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.owner.toLowerCase().includes(search.toLowerCase()),
      )

  if (!items.length)
    return <EmptyState label="No projects match that search." />

  return (
    <div className="space-y-2">
      {items.map(p => <ProjectCard key={p.id} project={p} />)}
    </div>
  )
}

function ProjectCard({ project: p }: { project: MemoryProject }) {
  const style = PROJECT_STATUS_STYLES[p.status] ?? PROJECT_STATUS_STYLES.closed
  const linkedOrg = p.linkedOrgId
    ? MOCK_ORGANIZATIONS.find(o => o.id === p.linkedOrgId)
    : null
  const linkedDecisions = MOCK_DECISIONS.filter(d =>
    p.decisions.includes(d.id),
  )

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden border-l-[3px]',
        style.strip,
      )}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <FolderOpen className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                  style.badge,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
                {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {p.owner}
              {linkedOrg ? ` · ${linkedOrg.name}` : ''}
            </p>
            <p className="text-xs text-foreground/70 mt-2 leading-relaxed">{p.notes}</p>
            {linkedDecisions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1.5">
                  Decisions on record
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {linkedDecisions.map(d => (
                    <EntityChip key={d.id} type="decision" label={d.title} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Decisions tab ─────────────────────────────────────────────────────────────

function DecisionsTab({ search }: { search: string }) {
  const { data: searchData, isLoading } = useQuery<ApiSearchResult>({
    queryKey: ['memory', 'search', 'decisions', search],
    queryFn: async () => {
      if (!search.trim()) return { projects: [], decisions: [] }
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(search)}`)
      if (!res.ok) throw new Error('unavailable')
      return res.json()
    },
    enabled: !!search.trim(),
    retry: false,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card px-4 py-5">
        <p className="text-xs text-muted-foreground">Your office is retrieving this information.</p>
      </div>
    )
  }

  const items = (search.trim() && searchData?.decisions?.length)
    ? normaliseDecisions(searchData.decisions)
    : MOCK_DECISIONS.filter(
        d =>
          !search ||
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.madeBy.toLowerCase().includes(search.toLowerCase()),
      )

  if (!items.length)
    return <EmptyState label="No decisions match that search." />

  return (
    <div className="space-y-2">
      {items.map(d => <DecisionCard key={d.id} decision={d} />)}
    </div>
  )
}

function DecisionCard({ decision: d }: { decision: MemoryDecision }) {
  const linkedProject = d.linkedProject
    ? MOCK_PROJECTS.find(p => p.id === d.linkedProject)
    : null

  return (
    <div className="rounded-xl border bg-card overflow-hidden border-l-[3px] border-l-amber-400">
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Scale className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug">{d.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {d.date} · {d.madeBy}
            </p>
            <div className="mt-2.5 px-3 py-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
              <p className="text-[10px] font-semibold text-amber-700/70 uppercase tracking-wider mb-1">
                Outcome
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed">{d.outcome}</p>
            </div>
            {d.context && (
              <p className="text-[11px] text-muted-foreground/70 mt-2 leading-relaxed">
                {d.context}
              </p>
            )}
            {linkedProject && (
              <div className="mt-2">
                <EntityChip type="project" label={linkedProject.name} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Notes tab (API-backed) ────────────────────────────────────────────────────

interface KnowledgeNote {
  id: string
  title?: string
  content: string
  source?: string
  createdAt?: string
}

function NotesTab({ search }: { search: string }) {
  const { data, isLoading, isError } = useQuery<KnowledgeNote[]>({
    queryKey: ['knowledge', search],
    queryFn: async () => {
      const url = search
        ? `/api/knowledge?search=${encodeURIComponent(search)}`
        : '/api/knowledge'
      const res = await fetch(url)
      if (!res.ok) throw new Error('unavailable')
      return res.json()
    },
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card px-4 py-5">
        <p className="text-xs text-muted-foreground">
          Knowledge notes are being retrieved.
        </p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-card px-4 py-5">
        <p className="text-xs text-muted-foreground">
          Knowledge notes are being retrieved.
        </p>
      </div>
    )
  }

  if (!data.length) return <EmptyState label="No notes found." />

  return (
    <div className="space-y-2">
      {data.map(note => (
        <div
          key={note.id}
          className="rounded-xl border bg-card overflow-hidden border-l-[3px] border-l-primary/30 px-4 py-3.5"
        >
          {note.title && (
            <p className="text-sm font-semibold text-foreground mb-1">{note.title}</p>
          )}
          <p className="text-xs text-foreground/70 leading-relaxed">{note.content}</p>
          {(note.source || note.createdAt) && (
            <p className="text-[10px] text-muted-foreground/50 mt-2 font-medium uppercase tracking-wide">
              {note.source ? `From ${note.source}` : 'Added by your office'}
              {note.createdAt ? ` · ${note.createdAt}` : ''}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Intelligence tab ──────────────────────────────────────────────────────────

const MOCK_PATTERNS: ExecutivePattern[] = [
  {
    id: 'pat-1',
    pattern: 'Morning decision-making',
    detail: 'You make most strategic decisions before 11am. Your acceptance rate for afternoon meeting requests is 40% lower.',
    value: 'Observed across 3 months',
    trend: 'positive',
  },
  {
    id: 'pat-2',
    pattern: 'Weekly investor touchpoints',
    detail: 'You proactively reach out to investors every 7-10 days, typically on Tuesdays and Thursdays.',
    value: 'Consistent pattern',
    trend: 'positive',
  },
]

const MOCK_INSIGHTS: PreferenceInsight[] = [
  {
    id: 'ins-1',
    insight: 'Brief over detailed',
    detail: 'You open and act on emails under 100 words 3x more often than longer messages. Summaries perform best.',
    category: 'Email behaviour',
  },
  {
    id: 'ins-2',
    insight: 'Prefer async over sync for updates',
    detail: 'Status updates via written notes get faster responses than meeting requests for the same topic.',
    category: 'Calendar and message patterns',
  },
]

const MOCK_RELATIONSHIPS: RelationshipIntelligence[] = [
  {
    id: 'rel-1',
    name: 'Marcus Chen',
    email: null,
    role: 'Lead Investor',
    company: 'Apex Ventures',
    messageCount30d: 2,
    messageCountTotal: 14,
    urgentCount: 1,
    recentTopics: ['Q3 milestones', 'follow-up'],
    daysLastContact: 18,
    trend: 'declining',
    openTasks: 1,
    healthScore: 45,
  },
  {
    id: 'rel-2',
    name: 'Priya Nair',
    email: null,
    role: 'VP Partnerships',
    company: 'CloudScale',
    messageCount30d: 8,
    messageCountTotal: 32,
    urgentCount: 0,
    recentTopics: ['partnership update', 'Q3 review'],
    daysLastContact: 3,
    trend: 'active',
    openTasks: 0,
    healthScore: 88,
  },
]

interface IntelligencePrefsResponse {
  insights?: PreferenceInsight[]
}

interface IntelligencePatternsResponse {
  patterns?: ExecutivePattern[]
}

interface IntelligenceRelationshipsResponse {
  relationships?: RelationshipIntelligence[]
}

function IntelligenceTab() {
  const { data: prefsData } = useQuery<IntelligencePrefsResponse>({
    queryKey: ['intelligence-preferences'],
    queryFn: () => api.get<IntelligencePrefsResponse>('/api/intelligence/preferences'),
    retry: false,
  })
  const { data: patternsData } = useQuery<IntelligencePatternsResponse>({
    queryKey: ['intelligence-patterns'],
    queryFn: () => api.get<IntelligencePatternsResponse>('/api/intelligence/patterns'),
    retry: false,
  })
  const { data: relationshipsData } = useQuery<IntelligenceRelationshipsResponse>({
    queryKey: ['intelligence-relationships'],
    queryFn: () => api.get<IntelligenceRelationshipsResponse>('/api/intelligence/relationships'),
    retry: false,
  })

  const patterns = (patternsData?.patterns ?? MOCK_PATTERNS).slice(0, 4)
  const insights = (prefsData?.insights ?? MOCK_INSIGHTS).slice(0, 4)
  const allRelationships = relationshipsData?.relationships ?? MOCK_RELATIONSHIPS
  const relationships = allRelationships
    .filter((r: RelationshipIntelligence) => r.trend === 'active' || r.trend === 'declining')
    .slice(0, 6)

  return (
    <div className="space-y-8">
      {/* How you work */}
      <div>
        <SectionLabel>How you work</SectionLabel>
        <div className="space-y-2">
          {patterns.map((p: ExecutivePattern) => (
            <ExecutivePatternCard key={p.id} pattern={p} />
          ))}
        </div>
      </div>

      {/* Learned from behaviour */}
      <div>
        <SectionLabel>Learned from behaviour</SectionLabel>
        <div className="space-y-2">
          {insights.map((i: PreferenceInsight) => (
            <PreferenceInsightCard key={i.id} insight={i} />
          ))}
        </div>
      </div>

      {/* Relationship health */}
      <div>
        <SectionLabel>Relationship health</SectionLabel>
        <div className="space-y-2">
          {relationships.map((r: RelationshipIntelligence) => (
            <RelationshipIntelligenceCard key={r.id} person={r} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-6 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<Tab>('people')
  const [search, setSearch] = useState('')

  const { data: prefsData } = useQuery<{ insights?: PreferenceInsight[] }>({
    queryKey: ['intelligence-preferences'],
    queryFn: () => api.get<{ insights?: PreferenceInsight[] }>('/api/intelligence/preferences'),
    retry: false,
  })

  const tabCounts: Record<Tab, number> = {
    people:        MOCK_PERSONS.length,
    organisations: MOCK_ORGANIZATIONS.length,
    projects:      MOCK_PROJECTS.length,
    decisions:     MOCK_DECISIONS.length,
    notes:         0,
    intelligence:  prefsData?.insights?.length ?? 0,
  }

  return (
    <div className="animate-fade-in max-w-2xl space-y-6 pb-16">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business Memory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Everything your office knows — people, organisations, projects, decisions.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search people, organisations, projects…"
          className={cn(
            'w-full rounded-xl border bg-card px-4 py-2.5 pl-8',
            'text-sm placeholder:text-muted-foreground/40 text-foreground',
            'outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40',
            'transition-all',
          )}
        />
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5 -mb-0.5">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          const count = tabCounts[tab.key]
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold tabular-nums px-1 py-px rounded-full min-w-[16px] text-center',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted-foreground/15 text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'people'        && <PeopleTab        search={search} />}
        {activeTab === 'organisations' && <OrganisationsTab search={search} />}
        {activeTab === 'projects'      && <ProjectsTab      search={search} />}
        {activeTab === 'decisions'     && <DecisionsTab     search={search} />}
        {activeTab === 'notes'         && <NotesTab         search={search} />}
        {activeTab === 'intelligence'  && <IntelligenceTab />}
      </div>

    </div>
  )
}
