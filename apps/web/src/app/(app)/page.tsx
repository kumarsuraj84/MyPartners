'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, CheckSquare, AlertCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Brief {
  id: string
  content: {
    greeting: string
    highlights: { title: string; description: string; type: string }[]
    decisionsNeeded: string[]
    topTasks: { title: string; priority: string; dueDate: string }[]
    summary: string
  }
}

interface Stats {
  total: number; unread: number; urgent: number; high: number
}
interface TaskStats {
  pending: number; in_progress: number; completed: number; overdue: number
}

export default function HomePage() {
  const { user } = useAuth()
  const { data: brief } = useQuery<Brief>({ queryKey: ['brief', 'today'], queryFn: () => api.get('/api/brief/today') })
  const { data: msgStats } = useQuery<Stats>({ queryKey: ['messages', 'stats'], queryFn: () => api.get('/api/messages/stats/overview') })
  const { data: taskStats } = useQuery<TaskStats>({ queryKey: ['tasks', 'stats'], queryFn: () => api.get('/api/tasks/stats') })

  const greeting = brief?.content?.greeting ?? `Good ${getTimeOfDay()}, ${user?.name?.split(' ')[0] ?? 'there'}`

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{greeting}</h1>
        <p className="text-muted-foreground mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Mail className="h-4 w-4" />} label="Unread" value={msgStats?.unread ?? 0} subLabel="messages" />
        <StatCard icon={<AlertCircle className="h-4 w-4 text-red-500" />} label="Urgent" value={msgStats?.urgent ?? 0} subLabel="need attention" highlight />
        <StatCard icon={<CheckSquare className="h-4 w-4" />} label="Pending" value={taskStats?.pending ?? 0} subLabel="tasks" />
        <StatCard icon={<Clock className="h-4 w-4 text-orange-500" />} label="Overdue" value={taskStats?.overdue ?? 0} subLabel="tasks" highlight={!!taskStats?.overdue} />
      </div>

      {/* Brief highlights */}
      {brief?.content?.highlights?.length ? (
        <div>
          <h2 className="text-base font-semibold mb-3">Today's Priorities</h2>
          <div className="space-y-2">
            {brief.content.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                <Badge variant={h.type === 'urgent' ? 'urgent' : h.type === 'task' ? 'normal' : 'secondary'} className="mt-0.5 flex-shrink-0">
                  {h.type}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{h.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{h.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Decisions needed */}
      {brief?.content?.decisionsNeeded?.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-orange-600">Decisions Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brief.content.decisionsNeeded.map((d, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">›</span>
                  {d}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Summary */}
      {brief?.content?.summary && (
        <div className="p-4 rounded-lg bg-muted/40 border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">AI Summary</p>
          <p className="text-sm leading-relaxed">{brief.content.summary}</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, subLabel, highlight }: { icon: React.ReactNode; label: string; value: number; subLabel: string; highlight?: boolean }) {
  return (
    <Card className={highlight && value > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className={`text-2xl font-bold ${highlight && value > 0 ? 'text-orange-600' : ''}`}>{value}</span>
        </div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{subLabel}</p>
      </CardContent>
    </Card>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
