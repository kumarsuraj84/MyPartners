'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CheckCircle2, Circle, Plus } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'

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
}

const TABS = [
  { key: 'task',        label: 'My Tasks' },
  { key: 'commitment',  label: 'Commitments' },
  { key: 'follow_up',   label: 'Follow-ups' },
  { key: 'waiting_for', label: 'Waiting for' },
] as const

type TabKey = typeof TABS[number]['key']

const EMPTY: Record<TabKey, string> = {
  task:        'No tasks. Add one above.',
  commitment:  'No pending commitments.',
  follow_up:   'Nothing being tracked.',
  waiting_for: 'Nothing pending from others.',
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabKey>('task')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', tab],
    queryFn: () => api.get(`/api/tasks?category=${tab}`),
  })

  const { data: completed = [] } = useQuery<Task[]>({
    queryKey: ['tasks', tab, 'completed'],
    queryFn: () => api.get(`/api/tasks?category=${tab}&status=completed`),
  })

  const createTask = useMutation({
    mutationFn: (title: string) =>
      api.post('/api/tasks', { title, category: tab, priority: 'medium' }),
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
    if (e.key === 'Enter' && draft.trim()) {
      createTask.mutate(draft.trim())
    }
    if (e.key === 'Escape') {
      setAdding(false)
      setDraft('')
    }
  }

  const active = tasks.filter(t => t.status !== 'completed')
  const recentCompleted = completed.slice(0, 3)

  return (
    <div className="animate-fade-in max-w-2xl space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          {active.length > 0 ? `${active.length} open` : 'All clear'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 rounded-lg bg-muted w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Quick add */}
      {tab === 'task' && (
        <div>
          {adding ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKey}
              onBlur={() => { if (!draft.trim()) { setAdding(false) } }}
              placeholder="Task title — Enter to save, Esc to cancel"
              className="w-full h-9 rounded-lg border bg-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <Plus className="h-4 w-4" />
              Add task
            </button>
          )}
        </div>
      )}

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-11 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-muted-foreground">{EMPTY[tab]}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {active.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => toggleDone.mutate({ id: task.id, status: 'completed' })}
            />
          ))}
        </div>
      )}

      {/* Recently completed */}
      {recentCompleted.length > 0 && (
        <section className="pt-2">
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">
            Recently completed
          </p>
          <div className="space-y-1">
            {recentCompleted.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggleDone.mutate({ id: task.id, status: 'pending' })}
                completed
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  completed = false,
}: {
  task: Task
  onToggle: () => void
  completed?: boolean
}) {
  const isOverdue = task.dueDate && !completed && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate))

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-colors hover:bg-accent/30 ${completed ? 'opacity-50' : ''}`}>
      <button
        onClick={onToggle}
        className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
      >
        {completed
          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
          : <Circle className="h-4 w-4" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${completed ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        {(task.waitingFrom || task.assigneeName) && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {task.waitingFrom ? `from ${task.waitingFrom}` : `→ ${task.assigneeName}`}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {task.priority === 'urgent' && (
          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">urgent</span>
        )}
        {task.priority === 'high' && (
          <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">high</span>
        )}
        {task.dueDate && (
          <span className={`text-[11px] ${
            isOverdue ? 'text-red-500 font-medium' : isDueToday ? 'text-orange-500 font-medium' : 'text-muted-foreground'
          }`}>
            {isOverdue ? 'overdue' : isDueToday ? 'today' : format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  )
}
