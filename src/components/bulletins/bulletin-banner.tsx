'use client'

import { useState } from 'react'

type Props = {
  campgroundName: string
  logoUrl: string | null
  category: string
  message: string
}

export function BulletinBanner({ campgroundName, logoUrl, category, message }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="rounded-2xl border border-flame/40 bg-flame/[0.06] p-4 flex items-start gap-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded logo
        <img
          src={logoUrl}
          alt={`${campgroundName} logo`}
          className="h-10 w-10 rounded-lg border border-white/10 bg-card object-cover shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded-lg border border-flame/30 bg-flame/10 grid place-items-center text-lg shrink-0">
          🏕️
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-flame">
            {category}
          </span>
          <span className="text-[11px] text-mist truncate">
            From {campgroundName}
          </span>
        </div>
        <p className="mt-1 text-sm text-cream leading-snug">{message}</p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-mist hover:bg-white/5 hover:text-cream text-base leading-none"
      >
        ✕
      </button>
    </div>
  )
}
