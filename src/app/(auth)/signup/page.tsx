import { redirect } from 'next/navigation'
import { SignupCard } from '@/components/auth/signup-card'
import { QrAuthHeader } from '@/components/auth/qr-auth-header'
import { resolveQrAuthContext } from '@/lib/auth/qr-auth-context'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Public signup. Mirrors /login's intent-aware header so a camper
// arriving from the QR landing page sees consistent framing whether
// they tapped "Join Camper Connections" or the header "Sign in"
// link.
//
// Two QR entry points feed this page:
//
//   * "Join Camper Connections" CTA → ?intent=connections&slug=<slug>&next=/campground/<slug>?token=<uuid>
//     Camper is opting into the social layer (visibility, interests,
//     waves). Post-account-creation + email-verify they land back on
//     the same campground hub URL, which detects them as authed,
//     upserts presence, and renders the Camper Connections layer
//     in place of the anon CTA. Legacy QR shape with just
//     `next=/checkin?token=…` and no intent param still resolves as
//     connections via the resolver's inference rule, so old printed
//     QRs don't break.
//
//   * Header "Sign in" tap → if they DON'T have an account yet, this
//     funnels through /login, where the "Don't have an account?
//     Sign up" link points back here with the same intent+slug
//     preserved -- so they continue to land on /signup with
//     intent=profile and the right campground context.
//
// The "Already have an account? Sign in" CTA at the bottom always
// forwards intent + slug + next so a returning camper bouncing back
// to /login keeps the same QR context.

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{
    next?: string
    intent?: string
    slug?: string
  }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  const sp = (await searchParams) ?? {}
  const ctx = await resolveQrAuthContext({
    intent: sp.intent,
    slug: sp.slug,
    next: sp.next,
  })

  // Post-OAuth destination. Same logic shape as the /login page so
  // the email + OAuth signup paths land at identical places:
  //   1. Honor an explicit ?next= if present (forwarded by the
  //      /campground/<slug> hub CTA).
  //   2. Otherwise, when we resolved a campground context, send
  //      the camper back to that campground's hub. The hub is
  //      auth-aware and renders the Camper Connections layer
  //      automatically -- no separate "finish checking in" screen.
  //      The ?connections=1 marker isn't load-bearing for the hub
  //      (auto-presence already triggers for any authed visitor),
  //      but it makes the URL self-describing for analytics + the
  //      eventual "Camper Connections unlocked" surface.
  //   3. No campground context at all: plain "/".
  const hubReturnTo = ctx.campground
    ? ctx.intent === 'connections'
      ? `/campground/${ctx.campground.slug}?connections=1`
      : `/campground/${ctx.campground.slug}`
    : null
  const nextHref =
    (typeof sp.next === 'string' && sp.next) || hubReturnTo || '/'

  // Forward QR context to the bottom "Sign in" link so a returning
  // camper who already has an account keeps the same intent/slug/next
  // when they bounce to /login. Each param is only included when
  // present so we don't pollute the URL with empty values.
  const loginHrefParams = new URLSearchParams()
  if (sp.intent) loginHrefParams.set('intent', sp.intent)
  if (sp.slug) loginHrefParams.set('slug', sp.slug)
  if (sp.next) loginHrefParams.set('next', sp.next)
  const loginHref = loginHrefParams.toString().length
    ? `/login?${loginHrefParams.toString()}`
    : '/login'

  return (
    <div className="space-y-6">
      <QrAuthHeader ctx={ctx} mode="signup" />
      <SignupCard
        next={nextHref}
        campgroundSlug={ctx.campground?.slug ?? null}
        returnTo={hubReturnTo}
      />
      <p className="text-center text-[11px] text-mist/80 leading-snug">
        Already have an account?{' '}
        <a
          href={loginHref}
          className="text-flame underline-offset-2 hover:underline"
        >
          Sign in
        </a>
        .
      </p>
    </div>
  )
}
