import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured } from '@/lib/stripe/server'
import { getSiteOrigin } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Creates a Stripe Customer Portal session for the currently signed-in
// campground owner, then redirects them to it. Used by the Manage
// Subscription button on /owner/billing.
export async function GET(request: NextRequest) {
  // 1. Auth gate — must be signed in.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/owner/login', request.url))
  }

  if (!isStripeConfigured()) {
    return NextResponse.redirect(
      new URL('/owner/billing?error=stripe_not_configured', request.url),
    )
  }

  // 2. Find this owner's campground + Stripe customer id.
  const admin = createSupabaseAdminClient()
  const { data: link } = await admin
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!link) {
    return NextResponse.redirect(
      new URL('/owner/billing?error=no_campground', request.url),
    )
  }
  const { data: cg } = await admin
    .from('campgrounds')
    .select('stripe_customer_id')
    .eq('id', link.campground_id)
    .maybeSingle()
  if (!cg?.stripe_customer_id) {
    return NextResponse.redirect(
      new URL('/owner/billing?error=no_stripe_customer', request.url),
    )
  }

  const stripe = getStripe()
  const origin = getSiteOrigin(request.headers)
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: cg.stripe_customer_id,
      return_url: `${origin}/owner/billing`,
    })
    return NextResponse.redirect(session.url, { status: 303 })
  } catch (err) {
    console.error('[stripe/portal]', err)
    return NextResponse.redirect(
      new URL('/owner/billing?error=portal_failed', request.url),
    )
  }
}
