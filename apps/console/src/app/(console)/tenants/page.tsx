'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { PageHeader, Table, Th, Td, Badge, LoadingRows, EmptyRow } from '@/components/ui'

interface Tenant {
  id: string; name: string; email: string; plan: string; role: string; createdAt: string
  stats: { messages: number; tasks: number; integrations: number; aiJobs: number }
}

export default function TenantsPage() {
  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ['admin', 'tenants'],
    queryFn: () => api.get('/api/admin/tenants'),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tenants"
        subtitle={`${tenants.length} tenant${tenants.length === 1 ? '' : 's'} — each user is their own tenant in V1`}
      />

      <Table>
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Plan</Th>
            <Th>Role</Th>
            <Th right>Messages</Th>
            <Th right>Tasks</Th>
            <Th right>Integrations</Th>
            <Th right>AI Jobs</Th>
            <Th>Joined</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <LoadingRows cols={10} />}
          {!isLoading && !tenants.length && <EmptyRow cols={10} message="No tenants yet" />}
          {tenants.map(t => (
            <tr key={t.id} className="hover:bg-zinc-50">
              <Td mono muted>{t.id.slice(0, 8)}…</Td>
              <Td>{t.name}</Td>
              <Td muted>{t.email}</Td>
              <Td><Badge label={t.plan} /></Td>
              <Td><Badge label={t.role} /></Td>
              <Td right mono>{t.stats.messages.toLocaleString()}</Td>
              <Td right mono>{t.stats.tasks.toLocaleString()}</Td>
              <Td right mono>{t.stats.integrations}</Td>
              <Td right mono>{t.stats.aiJobs.toLocaleString()}</Td>
              <Td muted>{format(new Date(t.createdAt), 'MMM d, yyyy')}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
