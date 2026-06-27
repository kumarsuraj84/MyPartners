'use client'

import { User, Building2, Folder, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'

type EntityChipProps = {
  type: 'person' | 'org' | 'project' | 'decision'
  name: string
  sub?: string
}

const TYPE_CONFIG = {
  person: {
    Icon: User,
    iconColor: 'text-violet-500',
    bgColor: 'bg-violet-50/70',
    borderColor: 'border-violet-200/60',
  },
  org: {
    Icon: Building2,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50/70',
    borderColor: 'border-blue-200/60',
  },
  project: {
    Icon: Folder,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200/60',
  },
  decision: {
    Icon: Scale,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50/70',
    borderColor: 'border-amber-200/60',
  },
} as const

export function EntityChip({ type, name, sub }: EntityChipProps) {
  const config = TYPE_CONFIG[type]
  const { Icon } = config

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md border',
        config.bgColor,
        config.borderColor
      )}
    >
      <Icon className={cn('h-3 w-3 flex-shrink-0', config.iconColor)} />
      <span className="font-medium text-foreground/80">{name}</span>
      {sub && (
        <span className="text-muted-foreground">{sub}</span>
      )}
    </span>
  )
}
