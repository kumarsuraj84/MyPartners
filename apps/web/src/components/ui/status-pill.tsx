'use client'

import { cn } from '@/lib/utils'

type StatusPillProps = {
  status: string
  animated?: boolean
}

function getStatusConfig(status: string): {
  dotColor: string
  bgColor: string
  textColor: string
  borderColor: string
  defaultAnimated: boolean
} {
  switch (status) {
    case 'Reviewing':
    case 'Preparing':
    case 'Organizing':
    case 'Following Up':
      return {
        dotColor: 'bg-blue-500',
        bgColor: 'bg-blue-50/60',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        defaultAnimated: true,
      }
    case 'Waiting for Approval':
    case 'Waiting':
      return {
        dotColor: 'bg-zinc-400',
        bgColor: 'bg-zinc-50/60',
        textColor: 'text-zinc-600',
        borderColor: 'border-zinc-200',
        defaultAnimated: false,
      }
    case 'Ready':
    case 'Completed':
    case 'Taken Care Of':
      return {
        dotColor: 'bg-emerald-500',
        bgColor: 'bg-emerald-50/60',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        defaultAnimated: false,
      }
    case 'Needs Attention':
    case 'Urgent':
      return {
        dotColor: 'bg-red-500',
        bgColor: 'bg-red-50/60',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        defaultAnimated: false,
      }
    default:
      return {
        dotColor: 'bg-zinc-400',
        bgColor: 'bg-zinc-50/60',
        textColor: 'text-zinc-600',
        borderColor: 'border-zinc-200',
        defaultAnimated: false,
      }
  }
}

export function StatusPill({ status, animated }: StatusPillProps) {
  const config = getStatusConfig(status)
  const shouldAnimate = animated !== undefined ? animated : config.defaultAnimated

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        config.bgColor,
        config.textColor,
        config.borderColor
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full flex-shrink-0',
          config.dotColor,
          shouldAnimate && 'animate-pulse'
        )}
      />
      {status}
    </span>
  )
}
