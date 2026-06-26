'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, MessageSquare, Check, Zap } from 'lucide-react'

interface Integration {
  id: string; provider: string; isActive: boolean; createdAt: string
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
    <div className="animate-fade-in space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and integrations</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

      {/* Integrations */}
      <div>
        <h2 className="text-base font-semibold mb-4">Integrations</h2>
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
                  <Badge variant="secondary" className="text-green-600 bg-green-100"><Check className="h-3 w-3 mr-1" />Connected</Badge>
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
                  <p className="text-xs text-muted-foreground">Coming in a future update</p>
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assistant</CardTitle>
          <CardDescription>Powers the brief, message reviews, and task suggestions</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Zap className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Groq · Llama 3.3 70B</p>
            <p className="text-xs text-muted-foreground">Reads and organizes in seconds</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-green-600 bg-green-100"><Check className="h-3 w-3 mr-1" />Active</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
