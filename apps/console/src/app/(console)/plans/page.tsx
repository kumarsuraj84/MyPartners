'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader, Table, Th, Td, StatCard, EmptyRow, LoadingRows } from '@/components/ui'

interface User { id: string; email: string; name: string; plan: string; role: string; createdAt: string }

const PLAN_LIMITS: Record<string, { messages: number; integrations: number; aiJobs: string }> = {
  free:         { messages: 100,   integrations: 1,  aiJobs: 'None' },
  starter:      { messages: 500,   integrations: 3,  aiJobs: 'Limited' },
  professional: { messages: 5000,  integrations: 10, aiJobs: 'Full' },
  enterprise:   { messages: -1,    integrations: -1, aiJobs: 'Full' },
}

export default function PlansPage() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/api/admin/users'),
  })

  const byPlan: Record<string, User[]> = {}
  for (const u of users) {
    byPlan[u.plan] ??= []
    byPlan[u.plan].push(u)
  }

  const planOrder = ['free', 'starter', 'professional', 'enterprise']

  return (
    <div className="space-y-5">
      <PageHeader title="Plans" subtitle="Subscription tier distribution and limits" />

      <div className="grid grid-cols-4 gap-3">
        {planOrder.map(plan => (
          <StatCard
            key={plan}
            label={plan.charAt(0).toUpperCase() + plan.slice(1)}
            value={(byPlan[plan] ?? []).length}
            sub="users"
          />
        ))}
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Plan Definitions</p>
        <Table>
          <thead>
            <tr>
              <Th>Plan</Th>
              <Th right>Message Limit</Th>
              <Th right>Integrations</Th>
              <Th>AI Jobs</Th>
              <Th right>Current Users</Th>
            </tr>
          </thead>
          <tbody>
            {planOrder.map(plan => {
              const limits = PLAN_LIMITS[plan]
              return (
                <tr key={plan} className="hover:bg-zinc-50">
                  <Td><span className="font-medium">{plan}</span></Td>
                  <Td right mono>{limits.messages === -1 ? 'Unlimited' : limits.messages.toLocaleString()}</Td>
                  <Td right mono>{limits.integrations === -1 ? 'Unlimited' : limits.integrations}</Td>
                  <Td muted>{limits.aiJobs}</Td>
                  <Td right mono>{(byPlan[plan] ?? []).length}</Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </div>

      {planOrder.map(plan => {
        const planUsers = byPlan[plan] ?? []
        if (!planUsers.length) return null
        return (
          <div key={plan}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              {plan.charAt(0).toUpperCase() + plan.slice(1)} Users ({planUsers.length})
            </p>
            <Table>
              <thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Name</Th>
                  <Th>Role</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <LoadingRows cols={3} />}
                {planUsers.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50">
                    <Td>{u.email}</Td>
                    <Td muted>{u.name}</Td>
                    <Td muted>{u.role}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )
      })}

      {!isLoading && !users.length && (
        <div className="text-xs text-zinc-400 py-4 text-center">No users yet</div>
      )}
    </div>
  )
}
