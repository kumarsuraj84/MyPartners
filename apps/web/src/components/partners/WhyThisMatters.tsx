'use client'

interface WhyThisMattersProps {
  text: string
}

export function WhyThisMatters({ text }: WhyThisMattersProps) {
  return (
    <div className="px-4 py-3 border-t bg-primary/[0.02]">
      <p className="text-[10px] font-semibold text-primary/60 uppercase tracking-wider mb-1.5">
        Why this matters
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  )
}
