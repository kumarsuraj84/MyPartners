// Shared UI primitives for the Platform Console

export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h1 className="text-sm font-semibold text-zinc-900">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: 'green' | 'red' | 'yellow'
}) {
  const val = color === 'red' ? 'text-red-600' : color === 'green' ? 'text-green-600' : color === 'yellow' ? 'text-yellow-600' : 'text-zinc-900'
  return (
    <div className="bg-white border border-zinc-200 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${val}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 overflow-hidden">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  )
}

export function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-50 border-b border-zinc-200 ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

export function Td({ children, mono, right, muted }: {
  children: React.ReactNode; mono?: boolean; right?: boolean; muted?: boolean
}) {
  return (
    <td className={`px-3 py-2 border-b border-zinc-100 ${mono ? 'font-mono' : ''} ${right ? 'text-right' : ''} ${muted ? 'text-zinc-400' : 'text-zinc-700'}`}>
      {children}
    </td>
  )
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-50 text-green-700 border-green-200',
  active:    'bg-green-50 text-green-700 border-green-200',
  ok:        'bg-green-50 text-green-700 border-green-200',
  running:   'bg-blue-50  text-blue-700  border-blue-200',
  pending:   'bg-zinc-50  text-zinc-500  border-zinc-200',
  failed:    'bg-red-50   text-red-700   border-red-200',
  inactive:  'bg-zinc-50  text-zinc-400  border-zinc-200',
  free:      'bg-zinc-50  text-zinc-500  border-zinc-200',
  starter:   'bg-blue-50  text-blue-700  border-blue-200',
  professional: 'bg-purple-50 text-purple-700 border-purple-200',
  enterprise:   'bg-amber-50  text-amber-700  border-amber-200',
  owner:        'bg-zinc-900 text-white border-zinc-900',
  administrator:'bg-zinc-800 text-white border-zinc-800',
  executive:    'bg-zinc-100 text-zinc-700 border-zinc-200',
  manager:      'bg-zinc-100 text-zinc-500 border-zinc-200',
  assistant:    'bg-zinc-50  text-zinc-400 border-zinc-200',
}

export function Badge({ label }: { label: string }) {
  const style = STATUS_STYLES[label?.toLowerCase()] ?? 'bg-zinc-50 text-zinc-500 border-zinc-200'
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium border rounded-sm ${style}`}>
      {label}
    </span>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
      {children}
    </p>
  )
}

export function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[0,1,2,3].map(i => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-3 py-2 border-b border-zinc-100">
              <div className="h-3 bg-zinc-100 rounded w-24" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function EmptyRow({ cols, message }: { cols: number; message?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-8 text-center text-xs text-zinc-400">
        {message ?? 'No data'}
      </td>
    </tr>
  )
}

export function mono(s: string, len = 8) {
  return <span className="font-mono text-zinc-400">{s.slice(0, len)}…</span>
}

export function duration(startedAt?: string | null, completedAt?: string | null): string {
  if (!startedAt || !completedAt) return '—'
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
