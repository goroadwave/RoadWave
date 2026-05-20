import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { GuestMessageThread } from '@/components/guest/guest-message-thread'

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
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t: token } = await searchParams

  return (
    <main className="min-h-screen">
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
      </header>
      <div className="px-4 pb-16">
        <div className="mx-auto max-w-xl space-y-4">
          <GuestMessageThread
            messageId={id}
            token={typeof token === 'string' ? token : ''}
          />
        </div>
      </div>
    </main>
  )
}
