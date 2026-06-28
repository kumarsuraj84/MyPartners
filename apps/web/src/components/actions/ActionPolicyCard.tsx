'use client'

import { cn } from '@/lib/utils'

type PolicyMode = 'manual' | 'confirm_once' | 'always' | 'disabled'

interface ActionPolicyCardProps {
  actionKey: string
  label: string
  description: string
  mode: PolicyMode
  onChange: (key: string, mode: PolicyMode) => void
  saving?: boolean
}

const MODES: { value: PolicyMode; label: string }[] = [
  { value: 'always', label: 'Always' },
  { value: 'confirm_once', label: 'Ask once' },
  { value: 'manual', label: 'Manual' },
  { value: 'disabled', label: 'Off' },
]

export function ActionPolicyCard({
  actionKey,
  label,
  description,
  mode,
  onChange,
  saving,
}: ActionPolicyCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onChange(actionKey, m.value)}
            disabled={saving}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              mode === m.value
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/40'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
