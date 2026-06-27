'use client'
import { PARTNERS } from '@/data/partners'
import { ExecutiveOfficeHeader } from '@/components/partners/ExecutiveOfficeHeader'
import { PartnerCard } from '@/components/partners/PartnerCard'
import { PartnerActivityFeed } from '@/components/partners/PartnerActivityFeed'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

export default function PartnersPage() {
  return (
    <div className="animate-fade-in max-w-2xl space-y-10 pb-16">
      <ExecutiveOfficeHeader />

      <section className="space-y-2">
        <Label>Your partners</Label>
        {PARTNERS.map(partner => (
          <PartnerCard key={partner.id} partner={partner} />
        ))}
      </section>

      <section>
        <Label>Recent office activity</Label>
        <PartnerActivityFeed />
      </section>
    </div>
  )
}
