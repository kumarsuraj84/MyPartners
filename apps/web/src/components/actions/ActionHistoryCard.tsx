'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, XCircle, Undo2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

interface ActionHistoryItem {
  id: string
  actionType: string
  label: string
  status: string
  createdAt: string
  completedAt?: string
  reversible: boolean
  reversed: boolean
}

interface ActionHistoryCardProps {
  item: ActionHistoryItem
  onReversed?: () => void
}

export function ActionHistoryCard({ item, onReversed }: ActionHistoryCardProps) {
  const [reversing, setReversing] = useState(false)
  const [done, setDone] = useState(item.reversed)

  async function handleUndo() {
    setReversing(true)
    try {
      const res = await fetch(`${API_URL}/api/actions/${item.id}/reverse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('eos:token') ?? ''}` },
      })
      if (res.ok) {
        setDone(true)
        onReversed?.()
      }
    } finally {
      setReversing(false)
    }
  }

  const statusIcon =
    item.status === 'completed' ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    ) : item.status === 'failed' ? (
      <XCircle className="h-3.5 w-3.5 text-red-500" />
    ) : (
      <Clock className="h-3.5 w-3.5 text-amber-500" />
    )

  return (
    <div className={cn('flex items-start gap-3 py-3 border-b border-border/40 last:border-0', done && 'opacity-60')}>
      <div className="mt-0.5">{statusIcon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{item.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          {done && ' · Reversed'}
        </p>
      </div>
      {item.reversible && !done && (
        <button
          onClick={handleUndo}
          disabled={reversing}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
        >
          <Undo2 className="h-3 w-3" />
          Undo
        </button>
      )}
    </div>
  )
}
