type Day = { day: string; count: number }

export function SignupsChart({ data }: { data: Day[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="rounded-2xl border border-white/5 bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-mist mb-3">
        New signups (last 30 days)
      </p>
      <ol className="grid grid-cols-30 gap-px h-24 items-end">
        {data.map((d) => {
          const heightPct = Math.round((d.count / max) * 100)
          const display = new Date(d.day).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
          return (
            <li
              key={d.day}
              className="relative bg-flame/15 border-t border-flame/40 group"
              style={{ height: `${Math.max(2, heightPct)}%` }}
              title={`${display}: ${d.count}`}
            >
              <span className="sr-only">
                {display}: {d.count} signups
              </span>
            </li>
          )
        })}
      </ol>
      <div className="mt-2 flex justify-between text-[10px] text-mist/70">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  )
}
