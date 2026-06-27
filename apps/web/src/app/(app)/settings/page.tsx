'use client'
import { useState, useCallback } from 'react'
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

interface ConfigData {
  notifications?: {
    urgentEmailEnabled?: boolean
    dailyBriefTime?: string
    weeklyDigestEnabled?: boolean
    digestDayOfWeek?: number
  }
  brief?: {
    urgentMessagesLimit?: number
    decisionsLimit?: number
    commitmentsLimit?: number
    followUpsLimit?: number
  }
  business_hours?: {
    timezone?: string
    startHour?: number
    endHour?: number
  }
}

const CONFIG_DEFAULTS: ConfigData = {
  notifications: {
    urgentEmailEnabled: false,
    dailyBriefTime: '08:00',
    weeklyDigestEnabled: false,
    digestDayOfWeek: 1,
  },
  brief: {
    urgentMessagesLimit: 8,
    decisionsLimit: 5,
    commitmentsLimit: 5,
    followUpsLimit: 5,
  },
  business_hours: {
    timezone: 'UTC',
    startHour: 9,
    endHour: 18,
  },
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

function SavedBadge({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
      <Check className="h-3 w-3" />Saved to your profile.
    </span>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({})

  const { data: integrations = [] } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: () => api.get('/api/integrations'),
  })

  const { data: configData } = useQuery<ConfigData>({
    queryKey: ['config'],
    queryFn: async () => {
      try {
        return await api.get<ConfigData>('/api/config')
      } catch {
        return CONFIG_DEFAULTS
      }
    },
    placeholderData: CONFIG_DEFAULTS,
  })

  const disconnect = useMutation({
    mutationFn: (provider: string) => api.delete(`/api/integrations/${provider}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  })

  const saveConfig = useMutation({
    mutationFn: ({ category, key, value }: { category: string; key: string; value: unknown }) =>
      api.put(`/api/config/${category}/${key}`, { value }),
    onSuccess: (_data, { category, key }) => {
      const savedKey = `${category}.${key}`
      setSavedKeys(prev => ({ ...prev, [savedKey]: true }))
      setTimeout(() => {
        setSavedKeys(prev => ({ ...prev, [savedKey]: false }))
      }, 3000)
      qc.invalidateQueries({ queryKey: ['config'] })
    },
  })

  const handleConfigChange = useCallback(
    (category: string, key: string, value: unknown) => {
      saveConfig.mutate({ category, key, value })
    },
    [saveConfig],
  )

  const cfg = configData ?? CONFIG_DEFAULTS
  const gmailIntegration = integrations.find(i => i.provider === 'gmail')
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const digestOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'off', label: 'Off' },
  ] as const

  // Derive digest frequency from config
  const digestFrequency: 'daily' | 'weekly' | 'off' =
    cfg.notifications?.weeklyDigestEnabled
      ? 'weekly'
      : cfg.notifications?.urgentEmailEnabled
        ? 'daily'
        : 'off'

  const handleDigestChange = (val: 'daily' | 'weekly' | 'off') => {
    if (val === 'weekly') {
      handleConfigChange('notifications', 'weeklyDigestEnabled', true)
      handleConfigChange('notifications', 'urgentEmailEnabled', false)
    } else if (val === 'daily') {
      handleConfigChange('notifications', 'weeklyDigestEnabled', false)
      handleConfigChange('notifications', 'urgentEmailEnabled', true)
    } else {
      handleConfigChange('notifications', 'weeklyDigestEnabled', false)
      handleConfigChange('notifications', 'urgentEmailEnabled', false)
    }
  }

  const briefTimeOptions = [
    { value: '06:00', label: '6:00 AM' },
    { value: '07:00', label: '7:00 AM' },
    { value: '08:00', label: '8:00 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '10:00', label: '10:00 AM' },
  ]

  return (
    <div className="animate-fade-in space-y-10 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Your preferences</h1>
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

      {/* Notification Preferences */}
      <section>
        <SectionLabel>Notification preferences</SectionLabel>
        <Card>
          <CardContent className="p-5 space-y-5">
            {/* Digest frequency */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Digest frequency</p>
                  <p className="text-xs text-muted-foreground">How often your assistant sends a roundup</p>
                </div>
                <SavedBadge visible={
                  savedKeys['notifications.weeklyDigestEnabled'] === true ||
                  savedKeys['notifications.urgentEmailEnabled'] === true
                } />
              </div>
              <div className="flex gap-2 flex-wrap">
                {digestOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleDigestChange(opt.value)}
                    className={[
                      'px-3 py-1.5 rounded-md text-sm border transition-colors',
                      digestFrequency === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brief generation time */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Brief generation time</p>
                  <p className="text-xs text-muted-foreground">When your morning brief is prepared each day</p>
                </div>
                <SavedBadge visible={savedKeys['notifications.dailyBriefTime'] === true} />
              </div>
              <select
                value={cfg.notifications?.dailyBriefTime ?? '08:00'}
                onChange={e => handleConfigChange('notifications', 'dailyBriefTime', e.target.value)}
                className="text-sm border border-border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {briefTimeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Assistant */}
      <section>
        <SectionLabel>Assistant</SectionLabel>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Office</CardTitle>
            <CardDescription>Reviews your brief, organizes messages, and prepares your follow-ups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Executive Office</p>
                <p className="text-xs text-muted-foreground">Reviewing, organizing, and preparing on your behalf</p>
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

      {/* Business Hours */}
      <section>
        <SectionLabel>Business hours</SectionLabel>
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
