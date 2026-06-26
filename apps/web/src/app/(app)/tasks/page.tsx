'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Circle, Plus, Trash2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface Task {
  id: string; title: string; description?: string; status: string; priority: string
  dueDate?: string; assigneeName?: string; tags: string[]; createdAt: string
}

const PRIORITY_VARIANTS: Record<string, 'urgent' | 'high' | 'normal' | 'low'> = {
  urgent: 'urgent', high: 'high', medium: 'normal', low: 'low',
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '', assigneeName: '' })

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/api/tasks'),
  })

  const createTask = useMutation({
    mutationFn: (data: typeof newTask) => api.post('/api/tasks', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowNew(false); setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assigneeName: '' }) },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/api/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteTask = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const pending = tasks.filter(t => t.status === 'pending')
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const completed = tasks.filter(t => t.status === 'completed')

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground mt-1">{tasks.filter(t => t.status !== 'completed').length} active tasks</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" />New Task
        </Button>
      </div>

      {showNew && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <input placeholder="Task title" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} className="w-full h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <textarea placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            <div className="flex gap-2">
              <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} className="h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <input type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} className="h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              <input placeholder="Assignee" value={newTask.assigneeName} onChange={e => setNewTask(p => ({ ...p, assigneeName: e.target.value }))} className="flex-1 h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button size="sm" onClick={() => createTask.mutate(newTask)} disabled={!newTask.title || createTask.isPending}>
                {createTask.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-6">
        <TaskColumn title="Pending" count={pending.length} tasks={pending} onToggle={(t) => updateStatus.mutate({ id: t.id, status: 'in_progress' })} onDelete={(id) => deleteTask.mutate(id)} />
        <TaskColumn title="In Progress" count={inProgress.length} tasks={inProgress} onToggle={(t) => updateStatus.mutate({ id: t.id, status: 'completed' })} onDelete={(id) => deleteTask.mutate(id)} />
        <TaskColumn title="Completed" count={completed.length} tasks={completed} onToggle={(t) => updateStatus.mutate({ id: t.id, status: 'pending' })} onDelete={(id) => deleteTask.mutate(id)} completed />
      </div>
    </div>
  )
}

function TaskColumn({ title, count, tasks, onToggle, onDelete, completed }: { title: string; count: number; tasks: Task[]; onToggle: (t: Task) => void; onDelete: (id: string) => void; completed?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className={`p-3 rounded-lg border bg-card ${completed ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-2">
              <button onClick={() => onToggle(task)} className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors">
                {completed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={PRIORITY_VARIANTS[task.priority] || 'normal'} className="text-[10px] px-1.5 py-0">{task.priority}</Badge>
                  {task.dueDate && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-2.5 w-2.5" />{format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  )}
                  {task.assigneeName && <span className="text-[10px] text-muted-foreground">→ {task.assigneeName}</span>}
                </div>
              </div>
              <button onClick={() => onDelete(task.id)} className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">No tasks</div>}
      </div>
    </div>
  )
}
