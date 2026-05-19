import { redirect } from 'next/navigation'

// /campground/<slug>/updates was the original "no-login guest hub"
// URL but as of Phase D of the guest-hub pivot (2026-05-20) the same
// content lives at /campground/<slug> directly. This file 307-redirects
// any /updates traffic forward to the unified hub so:
//   - Printed QR codes pointing at /updates keep working.
//   - Old onboarding emails sent before the unification still resolve.
//   - Owner-shared links bookmarked at /updates stay functional.
//
// We use redirect() (307 temporary) rather than permanentRedirect()
// (308) so that if the unification ever needs to be reverted, browsers
// and search engines haven't cached the redirect forever.
//
// The ?token=<uuid> query is preserved verbatim so the camper check-in
// flow that depends on it (anon QR scan → welcome → /checkin?token=
// for authed users) keeps working through the redirect.

export const dynamic = 'force-dynamic'

type Params = { slug: string }

export default async function CampgroundUpdatesRedirect({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams?: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const sp = (await searchParams) ?? {}
  const tokenPart =
    typeof sp.token === 'string' && sp.token.length > 0
      ? `?token=${encodeURIComponent(sp.token)}`
      : ''
  redirect(`/campground/${slug}${tokenPart}`)
}
