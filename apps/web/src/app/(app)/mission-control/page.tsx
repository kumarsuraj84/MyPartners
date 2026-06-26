'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AIJob {
  id: string; type: string; status: string; createdAt: string; completedAt?: string; error?: string
}

export default function MissionControlPage() {
  const { data: jobs = [] } = useQuery<AIJob[]>({ queryKey: ['ai', 'jobs'], queryFn: () => api.get('/api/ai/jobs'), refetchInterval: 5000 })

  const running = jobs.filter(j => j.status === 'running')
  const completed = jobs.filter(j => j.status === 'completed').slice(0, 5)
  const failed = jobs.filter(j => j.status === 'failed').slice(0, 3)

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Mission Control</h1>
        <p className="text-muted-foreground mt-1">Real-time view of AI activity and system status</p>
      </div>

      {/* Status tiles */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={running.length > 0 ? 'border-blue-200' : ''}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Cpu className={`h-5 w-5 text-blue-600 ${running.length > 0 ? 'animate-pulse-soft' : ''}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{running.length}</p>
              <p className="text-sm text-muted-foreground">Active jobs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'completed').length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className={failed.length > 0 ? 'border-red-200' : ''}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{failed.length}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active jobs */}
      {running.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Currently Processing</h2>
          <div className="space-y-2">
            {running.map(job => (
              <div key={job.id} className="flex items-center gap-3 p-4 rounded-lg border bg-blue-50/50">
                <Activity className="h-4 w-4 text-blue-600 animate-pulse-soft" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{formatJobType(job.type)}</p>
                  <p className="text-xs text-muted-foreground">Started {formatDistanceToNow(new Date(job.createdAt))} ago</p>
                </div>
                <Badge variant="normal">Running</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Activity</h2>
        {jobs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Cpu className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No AI jobs yet. Connect your inbox to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...completed, ...failed].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(job => (
              <div key={job.id} className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                {job.status === 'completed'
                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                  : <AlertTriangle className="h-4 w-4 text-red-600" />
                }
                <div className="flex-1">
                  <p className="text-sm font-medium">{formatJobType(job.type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.completedAt ? formatDistanceToNow(new Date(job.completedAt)) + ' ago' : '—'}
                    {job.error && <span className="text-red-500 ml-2">{job.error}</span>}
                  </p>
                </div>
                <Badge variant={job.status === 'completed' ? 'secondary' : 'destructive'}>
                  {job.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatJobType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
