'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  MOCK_PERSONS, MOCK_ORGANIZATIONS, MOCK_PROJECTS, MOCK_DECISIONS,
  type MemoryPerson, type MemoryOrganization, type MemoryProject, type MemoryDecision,
} from '@/data/mockMemory'
import { FolderOpen, Lightbulb } from 'lucide-react'

type Tab = 'people' | 'organisations' | 'projects' | 'decisions'

const TABS: { key: Tab; label: string; count: number }[] = [
  { key: 'people',        label: 'People',        count: MOCK_PERSONS.length },
  { key: 'organisations', label: 'Organisations',  count: MOCK_ORGANIZATIONS.length },
  { key: 'projects',      label: 'Projects',       count: MOCK_PROJECTS.length },
  { key: 'decisions',     label: 'Decisions',      count: MOCK_DECISIONS.length },
]

const ORG_TYPE_STYLES: Record<string, string> = {
  investor: 'bg-blue-50 text-blue-600 border-blue-200',
  client:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  partner:  'bg-violet-50 text-violet-600 border-violet-200',
  vendor:   'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const PROJECT_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

function PeopleTab() {
  return (
    <div className="space-y-2.5">
      {MOCK_PERSONS.map((p: MemoryPerson) => (
        <div key={p.id} className="rounded-xl border bg-card px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {p.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.role} · {p.company}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">Last contact: {p.lastContact}</p>
              <p className="text-xs text-foreground/70 mt-2 leading-relaxed">{p.relationship}</p>
              {p.notes && (
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed border-t pt-1.5">{p.notes}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OrganisationsTab() {
  return (
    <div className="space-y-2.5">
      {MOCK_ORGANIZATIONS.map((o: MemoryOrganization) => (
        <div key={o.id} className="rounded-xl border bg-card px-4 py-3.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-foreground">{o.name}</p>
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', ORG_TYPE_STYLES[o.type])}>
                {o.type.charAt(0).toUpperCase() + o.type.slice(1)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{o.domain} · {o.contactCount} contact{o.contactCount !== 1 ? 's' : ''}</p>
            <p className="text-xs text-foreground/70 mt-2 leading-relaxed">{o.notes}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProjectsTab() {
  return (
    <div className="space-y-2.5">
      {MOCK_PROJECTS.map((p: MemoryProject) => (
        <div key={p.id} className="rounded-xl border bg-card px-4 py-3.5">
          <div className="flex items-start gap-3">
            <FolderOpen className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', PROJECT_STATUS_STYLES[p.status])}>
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Owner: {p.owner}</p>
              <p className="text-xs text-foreground/70 mt-2 leading-relaxed">{p.notes}</p>
              {p.decisions.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1">
                    Related decisions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.decisions.map((d, i) => (
                      <span key={i} className="text-[11px] bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DecisionsTab() {
  return (
    <div className="space-y-2.5">
      {MOCK_DECISIONS.map((d: MemoryDecision) => (
        <div key={d.id} className="rounded-xl border bg-card px-4 py-3.5">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">{d.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{d.date} · {d.madeBy}</p>
              <div className="mt-2 px-3 py-2 rounded-lg bg-muted/50">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">Outcome</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{d.outcome}</p>
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-2 leading-relaxed">{d.context}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<Tab>('people')

  return (
    <div className="animate-fade-in max-w-2xl space-y-8 pb-16">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business Memory</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Everything your office has observed, learned, and remembered about your business.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-all',
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            <span className={cn(
              'text-[10px] font-bold tabular-nums px-1 py-px rounded-full min-w-[16px] text-center',
              activeTab === tab.key
                ? 'bg-primary/10 text-primary'
                : 'bg-muted-foreground/15 text-muted-foreground',
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'people'        && <PeopleTab />}
      {activeTab === 'organisations' && <OrganisationsTab />}
      {activeTab === 'projects'      && <ProjectsTab />}
      {activeTab === 'decisions'     && <DecisionsTab />}

    </div>
  )
}
