'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CheckCircle2, Circle, Plus, ArrowRight } from 'lucide-react'
import { format, isPast, isToday, formatDistanceToNow } from 'date-fns'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  category: string
  dueDate?: string
  assigneeName?: string
  waitingFrom?: string
  createdAt: string
  updatedAt: string
}

const SECTIONS = [
  { key: 'needs_me',   label: 'Needs Me' },
  { key: 'waiting',    label: 'Waiting For' },
  { key: 'delegated',  label: 'Delegated' },
  { key: 'completed',  label: 'Completed' },
] as const

type SectionKey = typeof SECTIONS[number]['key']

// Map PRD sections to backend category filters
const SECTION_EMPTY: Record<SectionKey, string> = {
  needs_me:  'Nothing needs you right now.',
  waiting:   'Nothing pending from others.',
  delegated: 'Nothing to track.',
  completed: 'Nothing completed yet.',
}

function suggestedNextAction(task: Task): string | null {
  if (task.status === 'in_progress') return 'In progress — check for updates'
  if (task.category === 'commitment' && task.dueDate && isPast(new Date(task.dueDate))) return 'Overdue — act now'
  if (task.category === 'commitment') return 'Review and act'
  if (task.category === 'waiting_for') return `Follow up with ${task.waitingFrom ?? 'them'}`
  if (task.category === 'follow_up') return 'Check if done'
  if (task.dueDate && isToday(new Date(task.dueDate))) return 'Due today'
  return null
}

export default function WorkPage() {
  const qc = useQueryClient()
  const [section, setSection] = useState<SectionKey>('needs_me')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Needs Me = tasks + commitments (active)
  const { data: myTasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'task'],
    queryFn: () => api.get('/api/tasks?category=task'),
    enabled: section === 'needs_me',
  })
  const { data: commitments = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'commitment'],
    queryFn: () => api.get('/api/tasks?category=commitment'),
    enabled: section === 'needs_me',
  })

  // Waiting For
  const { data: waitingFor = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'waiting_for'],
    queryFn: () => api.get('/api/tasks?category=waiting_for'),
    enabled: section === 'waiting',
  })

  // Delegated = follow-ups
  const { data: followUps = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'follow_up'],
    queryFn: () => api.get('/api/tasks?category=follow_up'),
    enabled: section === 'delegated',
  })

  // Completed (all categories, last 20)
  const { data: completedItems = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'completed'],
    queryFn: () => api.get('/api/tasks?status=completed'),
    enabled: section === 'completed',
  })

  const createTask = useMutation({
    mutationFn: (title: string) =>
      api.post('/api/tasks', { title, category: 'task', priority: 'medium' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setDraft('')
      setAdding(false)
    },
  })

  const toggleDone = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && draft.trim()) createTask.mutate(draft.trim())
    if (e.key === 'Escape') { setAdding(false); setDraft('') }
  }

  let items: Task[] = []
  if (section === 'needs_me') {
    items = [...myTasks, ...commitments].filter(t => t.status !== 'completed')
    items.sort((a, b) => {
      const po: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
      return (po[a.priority] ?? 2) - (po[b.priority] ?? 2)
    })
  } else if (section === 'waiting') {
    items = waitingFor.filter(t => t.status !== 'completed')
  } else if (section === 'delegated') {
    items = followUps.filter(t => t.status !== 'completed')
  } else if (section === 'completed') {
    items = completedItems.slice(0, 20)
  }

  const totalNeeds = [...myTasks, ...commitments].filter(t => t.status !== 'completed').length

  return (
    <div className="animate-fade-in max-w-2xl space-y-6 pb-16">

      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Commitments & Follow-ups</h1>
        <p className="text-sm text-muted-foreground">
          {section === 'needs_me' && items.length > 0 ? `${items.length} need${items.length === 1 ? 's' : ''} you` : ''}
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-0.5 p-0.5 rounded-lg bg-muted w-fit">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              section === s.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Quick add — only in Needs Me */}
      {section === 'needs_me' && (
        <div>
          {adding ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKey}
              onBlur={() => { if (!draft.trim()) setAdding(false) }}
              placeholder="Add an item…"
              className="w-full h-9 rounded-lg border bg-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          )}
        </div>
      )}

      {/* Work items */}
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-muted-foreground">{SECTION_EMPTY[section]}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(task => (
            <WorkItem
              key={task.id}
              task={task}
              onComplete={() => toggleDone.mutate({ id: task.id, status: 'completed' })}
              onReopen={() => toggleDone.mutate({ id: task.id, status: 'pending' })}
              isCompleted={section === 'completed'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function WorkItem({
  task,
  onComplete,
  onReopen,
  isCompleted,
}: {
  task: Task
  onComplete: () => void
  onReopen: () => void
  isCompleted: boolean
}) {
  const isOverdue = task.dueDate && !isCompleted && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate))
  const nextAction = suggestedNextAction(task)

  return (
    <div className={`rounded-xl border bg-card px-4 py-3.5 group transition-colors hover:border-border/80 ${isCompleted ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={isCompleted ? onReopen : onComplete}
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors mt-0.5"
        >
          {isCompleted
            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
            : <Circle className="h-4 w-4" />
          }
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium leading-snug ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </p>
            {task.priority === 'urgent' && (
              <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">urgent</span>
            )}
            {task.priority === 'high' && (
              <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">high</span>
            )}
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            {/* Owner */}
            {(task.assigneeName || task.waitingFrom) && (
              <span>
                {task.waitingFrom ? `Waiting on ${task.waitingFrom}` : `→ ${task.assigneeName}`}
              </span>
            )}

            {/* Due date */}
            {task.dueDate && (
              <span className={
                isOverdue ? 'text-red-500 font-medium' :
                isDueToday ? 'text-orange-500 font-medium' : ''
              }>
                {isOverdue
                  ? `${formatDistanceToNow(new Date(task.dueDate))} overdue`
                  : isDueToday ? 'Due today'
                  : `Due ${format(new Date(task.dueDate), 'MMM d')}`}
              </span>
            )}

            {/* Last activity */}
            {task.updatedAt && (
              <span>Updated {formatDistanceToNow(new Date(task.updatedAt))} ago</span>
            )}
          </div>

          {/* Suggested next action */}
          {!isCompleted && nextAction && (
            <div className="flex items-center gap-1 text-xs text-primary/70">
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
              <span>{nextAction}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
