import Link from 'next/link'

// Persistent "Demo Mode" banner pinned to the top of every
// /demo-center/* page. Tells the visiting campground owner that
// nothing they do here writes to a real campground, sends real
// emails, or triggers Stripe.
//
// The banner action keeps viewers INSIDE the demo: it routes to the
// Demo Center hub (/demo-center), never to the public marketing
// landing page. The only links that leave the demo are the explicit
// conversion CTAs (Start free 30-day trial / owner signup) on each page.
//
// Server component -- no interactivity, no state, no JS shipped.
// Rendered by the /demo-center layout so subroutes inherit it for
// free.

export function DemoModeBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-flame/30 bg-flame/15 text-cream backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2 min-w-0">
          <span aria-hidden className="text-base leading-none shrink-0">
            👁️
          </span>
          <span className="truncate sm:whitespace-normal">
            <strong className="text-flame uppercase tracking-[0.15em] text-[10px] sm:text-xs mr-2">
              Demo Mode
            </strong>
            <span className="text-mist">
              Changes here are for preview only.
            </span>
          </span>
        </span>
        <Link
          href="/demo-center"
          className="text-mist hover:text-cream underline-offset-2 hover:underline shrink-0"
        >
          ← Back to Demo Center
        </Link>
      </div>
    </div>
  )
}
