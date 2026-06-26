'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen, Plus, Search, FileText, Users, FolderOpen, Lightbulb,
  Calendar, ShoppingBag, Building2, User, ArrowRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface KnowledgeNote {
  id: string; type: string; title: string; content: string; tags: string[]; updatedAt: string
}

interface Person {
  id: string; name: string; email?: string; role?: string; company?: string
  organization?: { id: string; name: string } | null
  openCommitments: number; recentMessages: number
}

interface Organization {
  id: string; name: string; domain?: string; description?: string
  _count: { persons: number; projects: number }
  openWork: number
}

interface Project {
  id: string; name: string; description?: string; status: string
  organization?: { id: string; name: string } | null
  _count: { decisions: number }
}

interface Decision {
  id: string; title: string; description?: string; status: string; madeAt: string
  project?: { id: string; name: string } | null
}

interface SearchResult {
  query: string
  persons: Person[]
  organizations: Organization[]
  projects: Project[]
  decisions: Decision[]
  notes: KnowledgeNote[]
}

const NOTE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  note: FileText, meeting: Calendar, decision: Lightbulb,
  vendor: ShoppingBag, project: FolderOpen, contact: Users,
}
const NOTE_TYPES = ['note', 'meeting', 'decision', 'vendor', 'project', 'contact']

export default function MemoryPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<KnowledgeNote | null>(null)
  const [newNote, setNewNote] = useState({ type: 'note', title: '', content: '', tags: '' })

  const isSearching = search.trim().length > 1

  // Context-aware search (Business Memory)
  const { data: searchResults } = useQuery<SearchResult>({
    queryKey: ['memory', 'search', search],
    queryFn: () => api.get(`/api/memory/search?q=${encodeURIComponent(search)}`),
    enabled: isSearching,
  })

  // Browse mode: notes grid
  const { data: notes = [] } = useQuery<KnowledgeNote[]>({
    queryKey: ['knowledge', { typeFilter }],
    queryFn: () => api.get(`/api/knowledge?${typeFilter ? `type=${typeFilter}` : ''}`),
    enabled: !isSearching,
  })

  const createNote = useMutation({
    mutationFn: (data: { type: string; title: string; content: string; tags: string[] }) =>
      api.post('/api/knowledge', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge'] })
      setShowNew(false)
      setNewNote({ type: 'note', title: '', content: '', tags: '' })
    },
  })

  const deleteNote = useMutation({
    mutationFn: (id: string) => api.delete(`/api/knowledge/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['knowledge'] }); setSelected(null) },
  })

  const hasSearchResults = isSearching && searchResults && (
    searchResults.persons.length > 0 ||
    searchResults.organizations.length > 0 ||
    searchResults.projects.length > 0 ||
    searchResults.decisions.length > 0 ||
    searchResults.notes.length > 0
  )

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Memory</h1>
          <p className="text-muted-foreground mt-1">Conversations, meetings, decisions, vendors, projects</p>
        </div>
        {!isSearching && (
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Note
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people, organizations, projects, decisions…"
            className="w-full pl-9 pr-4 h-9 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        {!isSearching && NOTE_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
            className={`px-3 h-9 rounded-md text-xs font-medium border capitalize transition-colors ${
              typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Context-aware search results */}
      {isSearching && (
        <div className="space-y-6">
          {!hasSearchResults ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nothing found for "{search}"</p>
              <p className="text-xs mt-1">Your assistant will remember this automatically as communication flows in.</p>
            </div>
          ) : (
            <>
              {/* People */}
              {searchResults!.persons.length > 0 && (
                <section>
                  <SectionLabel icon={<User className="h-3.5 w-3.5" />}>People</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {searchResults!.persons.map(person => (
                      <div key={person.id} className="rounded-xl border bg-card p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{person.name}</p>
                            {(person.role || person.company || person.organization?.name) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {person.role ? `${person.role} · ` : ''}{person.organization?.name ?? person.company ?? ''}
                              </p>
                            )}
                            {person.email && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{person.email}</p>
                            )}
                          </div>
                        </div>
                        {(person.openCommitments > 0 || person.recentMessages > 0) && (
                          <div className="flex gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
                            {person.recentMessages > 0 && (
                              <span>{person.recentMessages} message{person.recentMessages !== 1 ? 's' : ''}</span>
                            )}
                            {person.openCommitments > 0 && (
                              <span className="text-orange-600">{person.openCommitments} open commitment{person.openCommitments !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Organizations */}
              {searchResults!.organizations.length > 0 && (
                <section>
                  <SectionLabel icon={<Building2 className="h-3.5 w-3.5" />}>Organizations</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {searchResults!.organizations.map(org => (
                      <div key={org.id} className="rounded-xl border bg-card p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{org.name}</p>
                            {org.domain && (
                              <p className="text-xs text-muted-foreground mt-0.5">{org.domain}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
                          {org._count.persons > 0 && <span>{org._count.persons} {org._count.persons === 1 ? 'person' : 'people'}</span>}
                          {org._count.projects > 0 && <span>{org._count.projects} project{org._count.projects !== 1 ? 's' : ''}</span>}
                          {org.openWork > 0 && <span className="text-orange-600">{org.openWork} open item{org.openWork !== 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Projects */}
              {searchResults!.projects.length > 0 && (
                <section>
                  <SectionLabel icon={<FolderOpen className="h-3.5 w-3.5" />}>Projects</SectionLabel>
                  <div className="space-y-2">
                    {searchResults!.projects.map(project => (
                      <div key={project.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card">
                        <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                          {project.organization && <span>{project.organization.name}</span>}
                          {project._count.decisions > 0 && (
                            <span>{project._count.decisions} decision{project._count.decisions !== 1 ? 's' : ''}</span>
                          )}
                          <Badge variant="outline" className="text-[10px] capitalize">{project.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Decisions */}
              {searchResults!.decisions.length > 0 && (
                <section>
                  <SectionLabel icon={<Lightbulb className="h-3.5 w-3.5" />}>Decisions</SectionLabel>
                  <div className="space-y-2">
                    {searchResults!.decisions.map(decision => (
                      <div key={decision.id} className="flex items-start gap-3 px-4 py-3.5 rounded-xl border bg-card">
                        <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{decision.title}</p>
                          {decision.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{decision.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                            {decision.project && <span>{decision.project.name}</span>}
                            <span>{formatDistanceToNow(new Date(decision.madeAt))} ago</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Notes */}
              {searchResults!.notes.length > 0 && (
                <section>
                  <SectionLabel icon={<FileText className="h-3.5 w-3.5" />}>Notes</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {searchResults!.notes.map(note => {
                      const Icon = NOTE_ICONS[note.type] ?? FileText
                      return (
                        <button
                          key={note.id}
                          onClick={() => setSelected(selected?.id === note.id ? null : note)}
                          className={`text-left p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors ${selected?.id === note.id ? 'border-primary' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground capitalize">{note.type}</span>
                          </div>
                          <p className="text-sm font-medium line-clamp-1">{note.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* Browse mode */}
      {!isSearching && (
        <>
          {showNew && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex gap-2">
                  <select
                    value={newNote.type}
                    onChange={e => setNewNote(p => ({ ...p, type: e.target.value }))}
                    className="h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {NOTE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                  <input
                    placeholder="Title"
                    value={newNote.title}
                    onChange={e => setNewNote(p => ({ ...p, title: e.target.value }))}
                    className="flex-1 h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <textarea
                  placeholder="Content"
                  value={newNote.content}
                  onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))}
                  rows={4}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
                <input
                  placeholder="Tags (comma-separated)"
                  value={newNote.tags}
                  onChange={e => setNewNote(p => ({ ...p, tags: e.target.value }))}
                  className="w-full h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={() => createNote.mutate({
                      ...newNote,
                      tags: newNote.tags.split(',').map(t => t.trim()).filter(Boolean),
                    })}
                    disabled={!newNote.title || !newNote.content || createNote.isPending}
                  >
                    {createNote.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4 min-h-0">
            <div className="flex-1 grid grid-cols-2 gap-3 content-start">
              {notes.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nothing stored yet.</p>
                  <p className="text-xs mt-1">Your assistant adds context automatically as communication flows in.</p>
                </div>
              ) : notes.map(note => {
                const Icon = NOTE_ICONS[note.type] ?? FileText
                return (
                  <button
                    key={note.id}
                    onClick={() => setSelected(selected?.id === note.id ? null : note)}
                    className={`text-left p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors ${selected?.id === note.id ? 'border-primary' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground capitalize">{note.type}</span>
                    </div>
                    <p className="text-sm font-medium line-clamp-1">{note.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {note.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(note.updatedAt))} ago
                    </p>
                  </button>
                )
              })}
            </div>

            {selected && (
              <div className="w-80 flex-shrink-0">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="capitalize">{selected.type}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNote.mutate(selected.id)}
                        className="text-destructive hover:text-destructive -mr-2"
                      >
                        Delete
                      </Button>
                    </div>
                    <CardTitle className="text-base mt-2">{selected.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.content}</p>
                    {selected.tags.length > 0 && (
                      <div className="flex gap-1 mt-4 flex-wrap">
                        {selected.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className="text-muted-foreground/60">{icon}</span>
      <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{children}</p>
    </div>
  )
}
