'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, MessageSquare, Check, Zap, Bell, Clock, Shield, Users, ToggleLeft } from 'lucide-react'

interface Integration {
  id: string; provider: string; isActive: boolean; createdAt: string
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold mb-3">{children}</h2>
}

function ComingSoonRow({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Badge variant="outline" className="text-xs flex-shrink-0 ml-4">Coming soon</Badge>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: integrations = [] } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: () => api.get('/api/integrations'),
  })

  const disconnect = useMutation({
    mutationFn: (provider: string) => api.delete(`/api/integrations/${provider}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  })

  const gmailIntegration = integrations.find(i => i.provider === 'gmail')
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  return (
    <div className="animate-fade-in space-y-10 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your assistant</p>
      </div>

      {/* Profile */}
      <section>
        <SectionLabel>Profile</SectionLabel>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-semibold text-primary">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="secondary" className="mt-1 capitalize">{user?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Connections */}
      <section>
        <SectionLabel>Connections</SectionLabel>
        <div className="space-y-3">
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Gmail</p>
                  <p className="text-xs text-muted-foreground">Your assistant monitors and organizes your email</p>
                </div>
              </div>
              {gmailIntegration?.isActive ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-green-600 bg-green-100">
                    <Check className="h-3 w-3 mr-1" />Connected
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => disconnect.mutate('gmail')}>Disconnect</Button>
                </div>
              ) : (
                <Button size="sm" asChild>
                  <a href={`${apiUrl}/api/integrations/gmail/connect`}>Connect Gmail</a>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Messages, commitments, and follow-ups from WhatsApp</p>
                </div>
              </div>
              <Badge variant="outline">Coming soon</Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Assistant */}
      <section>
        <SectionLabel>Assistant</SectionLabel>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Engine</CardTitle>
            <CardDescription>Powers the brief, message reviews, and task suggestions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Groq · Llama 3.3 70B</p>
                <p className="text-xs text-muted-foreground">Reads and organizes in seconds</p>
              </div>
              <Badge variant="secondary" className="ml-auto text-green-600 bg-green-100">
                <Check className="h-3 w-3 mr-1" />Active
              </Badge>
            </div>
            <div className="border-t pt-3">
              <ComingSoonRow
                icon={<Shield className="h-4 w-4" />}
                title="Assistant preferences"
                description="How your assistant prioritizes and communicates"
              />
              <ComingSoonRow
                icon={<Shield className="h-4 w-4" />}
                title="Priority rules"
                description="Define what counts as urgent for your role"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Notifications */}
      <section>
        <SectionLabel>Notifications</SectionLabel>
        <Card>
          <CardContent className="p-5">
            <ComingSoonRow
              icon={<Bell className="h-4 w-4" />}
              title="Urgent alerts"
              description="Notified immediately when something critical arrives"
            />
            <ComingSoonRow
              icon={<Clock className="h-4 w-4" />}
              title="Morning brief"
              description="Daily summary delivered at your preferred time"
            />
            <ComingSoonRow
              icon={<Bell className="h-4 w-4" />}
              title="Digest"
              description="Periodic roundup of what your assistant handled"
            />
          </CardContent>
        </Card>
      </section>

      {/* Business Hours */}
      <section>
        <SectionLabel>Business Hours</SectionLabel>
        <Card>
          <CardContent className="p-5">
            <ComingSoonRow
              icon={<Clock className="h-4 w-4" />}
              title="Working hours"
              description="When your assistant should expect you to be available"
            />
            <ComingSoonRow
              icon={<Clock className="h-4 w-4" />}
              title="Timezone"
              description="Used for scheduling and brief timing"
            />
          </CardContent>
        </Card>
      </section>

      {/* Team */}
      <section>
        <SectionLabel>Team</SectionLabel>
        <Card>
          <CardContent className="p-5">
            <ComingSoonRow
              icon={<Users className="h-4 w-4" />}
              title="Team members"
              description="People your assistant can delegate to and track on your behalf"
            />
            <ComingSoonRow
              icon={<Users className="h-4 w-4" />}
              title="Delegation rules"
              description="Who handles what when you're unavailable"
            />
          </CardContent>
        </Card>
      </section>

      {/* Feature flags */}
      <section>
        <SectionLabel>Features</SectionLabel>
        <Card>
          <CardContent className="p-5">
            <ComingSoonRow
              icon={<ToggleLeft className="h-4 w-4" />}
              title="Auto-brief generation"
              description="Generate your morning brief automatically each day"
            />
            <ComingSoonRow
              icon={<ToggleLeft className="h-4 w-4" />}
              title="Commitment detection"
              description="Automatically extract commitments from email"
            />
            <ComingSoonRow
              icon={<ToggleLeft className="h-4 w-4" />}
              title="Follow-up reminders"
              description="Remind you when a follow-up hasn't been responded to"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
