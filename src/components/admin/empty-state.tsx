type Props = {
  title: string
  body?: string
  notConnected?: boolean
}

export function EmptyState({ title, body, notConnected }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center">
      <p className="text-sm font-semibold text-cream">{title}</p>
      {body && <p className="mt-1 text-xs text-mist leading-relaxed">{body}</p>}
      {notConnected && (
        <p className="mt-2 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-[10px] font-semibold text-flame">
          Not connected yet
        </p>
      )}
    </div>
  )
}
