'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

// Floating circular tour entry point. Renders on every route except /tour
// itself (no point pointing to the page you're already on). Tries the Riley
// avatar first; if /riley.png isn't deployed, falls back to a 🏕️ emoji.
export function FloatingTourButton() {
  const pathname = usePathname()
  const [imgError, setImgError] = useState(false)

  if (pathname === '/tour') return null

  return (
    <Link
      href="/tour"
      aria-label="Take the tour"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-card border border-flame/40 shadow-[0_0_22px_rgba(245,158,11,0.35)] hover:shadow-[0_0_36px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-100 transition-all"
    >
      {imgError ? (
        <span className="text-2xl leading-none" aria-hidden>
          🏕️
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- onError fallback to emoji needs <img>
        <img
          src="/riley.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </Link>
  )
}
