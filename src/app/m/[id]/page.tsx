import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { GuestMessageThread } from '@/components/guest/guest-message-thread'

// Slug allow-list -- accept lowercase letters, digits, and hyphens
// only, length-bounded. Anything else gets dropped to null so the
// "Back to campground page" link won't render. Defense in depth even
// though the link target is always same-origin /campground/<slug>.
const SLUG_RE = /^[a-z0-9-]{1,80}$/

function normalizeFromSlug(raw: string | string[] | undefined): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().toLowerCase()
  return SLUG_RE.test(trimmed) ? trimmed : null
}

export const metadata: Metadata = {
  title: 'Private reply thread — RoadWave',
  description:
    'View and reply to the private thread you started with the campground office.',
  robots: {
    // Token-gated page -- don't let search engines index any version
    // of the URL that happens to leak. The actual thread is also
    // gated by site number + last name verification client-side
    // before any data renders.
    index: false,
    follow: false,
  },
}

// Token-gated guest reply page. The route is /m/<id>?t=<token>.
//
// We render essentially nothing on the server -- the thread fetch
// happens client-side via the Supabase anon client (so the URL never
// touches our server logs with the token + site + last name together)
// and only after the guest enters site number + last name as the
// soft second factor. The guest_message_thread + guest_post_message_reply
// RPCs (mig 0055) enforce token + site + last name match server-side.
//
// What this page never does:
//   * Show any other message, any campground inbox, any campground
//     contact details, any other guest's data.
//   * Persist the token / site / last name anywhere except in the
//     in-memory state of the client island.
//   * Log the token or PII.

export default async function GuestThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string; from?: string | string[] }>
}) {
  const { id } = await params
  const sp = await searchParams
  const token = typeof sp.t === 'string' ? sp.t : ''
  const fromSlug = normalizeFromSlug(sp.from)
  // When we know a safe campground slug, build the prominent "Back to
  // campground page" target. When we don't, we deliberately render NO
  // prominent back button -- the client island still shows a small
  // "RoadWave home" footer link so the camper isn't stranded, but we
  // never pretend a generic "/" link returns them to the campground.
  const campgroundBackHref = fromSlug ? `/campground/${fromSlug}` : null

  return (
    <main className="min-h-screen">
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        {campgroundBackHref && (
          <Link
            href={campgroundBackHref}
            className="text-xs font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
          >
            ← Back to campground page
          </Link>
        )}
      </header>
      <div className="px-4 pb-16">
        <div className="mx-auto max-w-xl space-y-4">
          <GuestMessageThread
            messageId={id}
            token={token}
            campgroundBackHref={campgroundBackHref}
          />
        </div>
      </div>
    </main>
  )
}
