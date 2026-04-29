import Link from 'next/link'

// Tiny footer for owner-facing surfaces. SiteFooter is suppressed under
// /owner so the marketing links don't show up there; this fills the gap
// with the links owners actually need.
export function OwnerFooter() {
  return (
    <footer className="border-t border-white/5 py-5">
      <div className="mx-auto max-w-3xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-mist/80">
        <p>RoadWave — Privacy-first campground connections.</p>
        <ul className="flex flex-wrap items-center gap-4">
          <li>
            <Link
              href="/campground-safety"
              className="hover:text-flame transition-colors"
            >
              Safety overview
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="hover:text-flame transition-colors">
              Privacy
            </Link>
          </li>
          <li>
            <Link href="/terms" className="hover:text-flame transition-colors">
              Terms
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  )
}
