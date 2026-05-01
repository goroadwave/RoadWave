import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured } from '@/lib/stripe/server'
import { getStripePriceId, isPlan } from '@/lib/stripe/prices'
import { getSiteOrigin } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Creates a Stripe Checkout Session for a previously-saved
// owner_signup_submission row, then redirects the visitor to the
// Stripe-hosted checkout page. Called by the /owner/signup form's
// server action after the submission is persisted.
//
// Inputs:
//   ?submission_id=<uuid>  — the row to bill against
//   &plan=monthly|annual   — which price to use
export async function GET(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.redirect(
      new URL('/owner/signup?error=stripe_not_configured', request.url),
    )
  }

  const sp = request.nextUrl.searchParams
  const submissionId = sp.get('submission_id')
  const plan = sp.get('plan')
  if (!submissionId || !isPlan(plan)) {
    return NextResponse.redirect(
      new URL('/owner/signup?error=invalid_request', request.url),
    )
  }
  const priceId = getStripePriceId(plan)
  if (!priceId) {
    return NextResponse.redirect(
      new URL('/owner/signup?error=price_not_configured', request.url),
    )
  }

  const admin = createSupabaseAdminClient()
  const { data: submission } = await admin
    .from('owner_signup_submissions')
    .select('id, email, campground_name')
    .eq('id', submissionId)
    .maybeSingle()
  if (!submission) {
    return NextResponse.redirect(
      new URL('/owner/signup?error=submission_not_found', request.url),
    )
  }

  const stripe = getStripe()
  const headerList = request.headers
  const origin = getSiteOrigin(headerList)
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: submission.email,
      // Carry the submission id through Stripe so the webhook can
      // link the resulting subscription back to our row.
      client_reference_id: submission.id,
      subscription_data: {
        // 14-day trial mirrored at the DB layer (campgrounds.trial_ends_at).
        trial_period_days: 14,
        metadata: {
          submission_id: submission.id,
          campground_name: submission.campground_name,
        },
      },
      metadata: {
        submission_id: submission.id,
        plan,
      },
      success_url: `${origin}/start/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/start?canceled=1`,
      allow_promotion_codes: true,
    })

    // Persist the session id so we can correlate the webhook safely.
    await admin
      .from('owner_signup_submissions')
      .update({ stripe_session_id: session.id })
      .eq('id', submission.id)

    if (!session.url) {
      return NextResponse.redirect(
        new URL('/owner/signup?error=stripe_session_no_url', request.url),
      )
    }
    return NextResponse.redirect(session.url, { status: 303 })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.redirect(
      new URL('/owner/signup?error=stripe_failed', request.url),
    )
  }
}
