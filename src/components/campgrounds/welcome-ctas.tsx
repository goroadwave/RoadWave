'use client'

// Optional secondary CTAs on the public campground welcome page —
// Google Review + Book Again. Each is rendered only when the owner has
// configured the corresponding URL on /owner/profile. On tap we log the
// click to /api/campground/event so it rolls into the dashboard's
// "This Week" stats card and the Monday weekly report email, then we
// open the external URL. Logging is fire-and-forget via sendBeacon when
// available (survives the navigation away) with a fetch keepalive
// fallback for browsers that don't have it.

type Props = {
  campgroundId: string
  reviewUrl: string | null
  bookingUrl: string | null
}

function logEvent(campgroundId: string, eventType: string) {
  const body = JSON.stringify({
    campground_id: campgroundId,
    event_type: eventType,
  })
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/campground/event', blob)
      return
    }
  } catch {
    // fall through to fetch
  }
  void fetch('/api/campground/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Logging is best-effort.
  })
}

export function WelcomeCtas({ campgroundId, reviewUrl, bookingUrl }: Props) {
  if (!reviewUrl && !bookingUrl) return null

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        Loved your stay?
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {reviewUrl && (
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logEvent(campgroundId, 'review_click')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-5 py-3 text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
          >
            <span aria-hidden>⭐</span> Leave a Google Review
          </a>
        )}
        {bookingUrl && (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logEvent(campgroundId, 'book_again_click')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-5 py-3 text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
          >
            <span aria-hidden>🛎️</span> Book Again
          </a>
        )}
      </div>
    </section>
  )
}
