type Tone = 'new' | 'read' | 'replied' | 'flagged' | 'open' | 'review' | 'resolved' | 'active' | 'inactive'

const STYLES: Record<Tone, string> = {
  new: 'border-flame/40 bg-flame/15 text-flame',
  read: 'border-white/10 bg-white/5 text-cream',
  replied: 'border-leaf/40 bg-leaf/10 text-leaf',
  flagged: 'border-red-400/40 bg-red-500/10 text-red-300',
  open: 'border-flame/40 bg-flame/15 text-flame',
  review: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  resolved: 'border-leaf/40 bg-leaf/10 text-leaf',
  active: 'border-leaf/40 bg-leaf/10 text-leaf',
  inactive: 'border-white/10 bg-white/5 text-mist',
}

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STYLES[tone]}`}
    >
      {label}
    </span>
  )
}
