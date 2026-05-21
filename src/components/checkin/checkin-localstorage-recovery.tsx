'use client'

import { useRouter } from 'next/navigation'
import { useLayoutEffect, useState } from 'react'

// Last-ditch recovery for the "You're not at a campground right now"
// fallback page at /checkin. The OAuth handoff already has two
// server-side recovery layers (the `next` query param on the
// callback URL + an HttpOnly cookie consumed by /auth/callback). This
// component is the third layer: a client-side localStorage entry that
// GoogleAuthButton writes alongside the cookie, so that even if BOTH
// the query param AND the cookie were dropped during the Google
// round-trip (e.g. cross-domain cookie loss, browser privacy
// settings), the camper still ends up back on the campground hub.
//
// Runs in useLayoutEffect so the redirect happens before paint when a
// recovery is possible -- the camper doesn't see the fallback UI
// flash before the redirect fires. When recovery isn't possible, the
// children render normally.
//
// Key kept in sync with src/components/auth/google-auth-button.tsx --
// renaming either side requires updating the other.

const KEY = 'roadwave:oauth-campground-context'
const SLUG_RE = /^[a-z0-9-]{1,80}$/
const RETURN_TO_RE = /^\/campground\/[a-z0-9-]{1,80}(\?[\w%=&-]{0,200})?$/

type StoredContext = {
  slug: string
  returnTo: string
  ts: number
  ttlMs?: number
}

function readAndValidate(): string | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredContext>
    const slug = typeof parsed.slug === 'string' ? parsed.slug : null
    const returnTo = typeof parsed.returnTo === 'string' ? parsed.returnTo : null
    const ts = typeof parsed.ts === 'number' ? parsed.ts : null
    if (!slug || !returnTo || !ts) return null
    if (!SLUG_RE.test(slug)) return null
    if (!RETURN_TO_RE.test(returnTo)) return null
    if (!returnTo.startsWith(`/campground/${slug}`)) return null
    const ttl = typeof parsed.ttlMs === 'number' ? parsed.ttlMs : 15 * 60 * 1000
    if (Date.now() - ts > ttl) return null
    return returnTo
  } catch {
    return null
  }
}

function clear(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function CheckinLocalStorageRecovery({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [recovering, setRecovering] = useState(true)

  useLayoutEffect(() => {
    const returnTo = readAndValidate()
    if (returnTo) {
      // Consume the stored value before redirecting so a stale
      // entry can't loop the camper if they navigate back here.
      clear()
      router.replace(returnTo)
      return
    }
    // Intentional cascading render: start hidden, reveal the fallback
    // children only after the localStorage check completes. Without
    // this, the camper would briefly see "You're not at a campground
    // right now" between hydration and the recovery effect firing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecovering(false)
  }, [router])

  if (recovering) return null
  return <>{children}</>
}
