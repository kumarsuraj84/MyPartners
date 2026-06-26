'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Plus, Search, FileText, Users, FolderOpen, Lightbulb, Calendar, ShoppingBag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface KnowledgeNote {
  id: string; type: string; title: string; content: string; tags: string[]; updatedAt: string
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  note: FileText, meeting: Calendar, decision: Lightbulb, vendor: ShoppingBag, project: FolderOpen, contact: Users,
}
const TYPES = ['note', 'meeting', 'decision', 'vendor', 'project', 'contact']

export default function KnowledgePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<KnowledgeNote | null>(null)
  const [newNote, setNewNote] = useState({ type: 'note', title: '', content: '', tags: '' })

  const { data: notes = [] } = useQuery<KnowledgeNote[]>({
    queryKey: ['knowledge', { search, typeFilter }],
    queryFn: () => api.get(`/api/knowledge?${new URLSearchParams({ ...(search ? { search } : {}), ...(typeFilter ? { type: typeFilter } : {}) }).toString()}`),
  })

  const createNote = useMutation({
    mutationFn: (data: { type: string; title: string; content: string; tags: string[] }) => api.post('/api/knowledge', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['knowledge'] }); setShowNew(false); setNewNote({ type: 'note', title: '', content: '', tags: '' }) },
  })

  const deleteNote = useMutation({
    mutationFn: (id: string) => api.delete(`/api/knowledge/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['knowledge'] }); setSelected(null) },
  })

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Memory</h1>
          <p className="text-muted-foreground mt-1">Conversations, meetings, decisions, vendors, projects</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />Add Note</Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search knowledge base..." className="w-full pl-9 pr-4 h-9 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        {TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)} className={`px-3 h-9 rounded-md text-xs font-medium border capitalize transition-colors ${typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'}`}>{t}</button>
        ))}
      </div>

      {showNew && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex gap-2">
              <select value={newNote.type} onChange={e => setNewNote(p => ({ ...p, type: e.target.value }))} className="h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring capitalize">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="Title" value={newNote.title} onChange={e => setNewNote(p => ({ ...p, title: e.target.value }))} className="flex-1 h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <textarea placeholder="Content" value={newNote.content} onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))} rows={4} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            <input placeholder="Tags (comma-separated)" value={newNote.tags} onChange={e => setNewNote(p => ({ ...p, tags: e.target.value }))} className="w-full h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button size="sm" onClick={() => createNote.mutate({ ...newNote, tags: newNote.tags.split(',').map(t => t.trim()).filter(Boolean) })} disabled={!newNote.title || !newNote.content || createNote.isPending}>
                {createNote.isPending ? 'Saving...' : 'Save'}
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
            </div>
          ) : notes.map(note => {
            const Icon = TYPE_ICONS[note.type] ?? FileText
            return (
              <button key={note.id} onClick={() => setSelected(note)} className={`text-left p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors ${selected?.id === note.id ? 'border-primary' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">{note.type}</span>
                </div>
                <p className="text-sm font-medium line-clamp-1">{note.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {note.tags.slice(0, 3).map(tag => <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">{formatDistanceToNow(new Date(note.updatedAt))} ago</p>
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
                  <Button size="sm" variant="ghost" onClick={() => deleteNote.mutate(selected.id)} className="text-destructive hover:text-destructive -mr-2">Delete</Button>
                </div>
                <CardTitle className="text-base mt-2">{selected.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.content}</p>
                {selected.tags.length > 0 && (
                  <div className="flex gap-1 mt-4 flex-wrap">
                    {selected.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
