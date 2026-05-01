import { type NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/server'
import { sendOwnerOnboardingKitEmail } from '@/lib/email/owner-onboarding-kit'
import { getSiteOrigin } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Stripe webhook handler. Provisions accounts on first checkout
// completion and keeps subscription_status / current_period_end in
// sync as Stripe sends customer.subscription.* and invoice.* events.
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — refusing event')
    return new NextResponse('webhook secret not configured', { status: 503 })
  }

  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return new NextResponse('missing signature', { status: 400 })
  }
  const raw = await request.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret)
  } catch (err) {
    console.error('[stripe/webhook] signature verify failed:', err)
    return new NextResponse('signature verify failed', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          request,
        )
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        await handleSubscriptionChanged(
          event.data.object as Stripe.Subscription,
        )
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(
          event.data.object as Stripe.Subscription,
        )
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        // Ignore other event types — Stripe sends a lot.
        break
    }
  } catch (err) {
    console.error(`[stripe/webhook] handler ${event.type} failed:`, err)
    // Return 500 so Stripe retries.
    return new NextResponse('handler error', { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// On checkout completion: provision the auth user + campground +
// admin link if not already done. Idempotent — re-fires for the
// same session do nothing.
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  request: NextRequest,
) {
  const submissionId = session.client_reference_id
  if (!submissionId) {
    console.warn('[stripe/webhook] checkout.session.completed missing client_reference_id')
    return
  }

  const admin = createSupabaseAdminClient()
  const { data: submission } = await admin
    .from('owner_signup_submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle()
  if (!submission) {
    console.warn('[stripe/webhook] no submission for', submissionId)
    return
  }
  if (submission.status === 'provisioned') {
    // Already done — Stripe re-fired the event.
    return
  }

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : (session.customer?.id ?? null)
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription?.id ?? null)
  const plan =
    (session.metadata?.plan as 'monthly' | 'annual' | undefined) ?? 'monthly'

  // 1. Create the auth user. Idempotent: if email already exists,
  // reuse that user.
  let userId: string | null = null
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: submission.email,
      email_confirm: true,
      user_metadata: {
        owner_name: submission.owner_name,
        campground_name: submission.campground_name,
        signup_source: 'self_serve_funnel',
      },
    })
  if (created?.user) {
    userId = created.user.id
  } else if (createError && createError.message.includes('already')) {
    // Look up by email.
    const { data: existing } = await admin.auth.admin.listUsers()
    userId =
      existing?.users.find((u) => u.email === submission.email)?.id ?? null
  } else if (createError) {
    console.error('[stripe/webhook] createUser failed:', createError.message)
    return
  }
  if (!userId) {
    console.error('[stripe/webhook] could not resolve userId for', submission.email)
    return
  }

  // 2. Create the campground row with billing fields populated.
  const slug = await uniqueSlugFor(admin, submission.campground_name)
  const { data: cg, error: cgError } = await admin
    .from('campgrounds')
    .insert({
      slug,
      name: submission.campground_name,
      city: submission.city,
      region: submission.state,
      website: submission.website,
      phone: submission.phone,
      logo_url: submission.logo_url,
      owner_email: submission.email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      subscription_status: 'trial',
      trial_started_at: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, slug')
    .single()
  if (cgError || !cg) {
    console.error('[stripe/webhook] campground insert failed:', cgError?.message)
    return
  }

  // 3. Link the user as the campground's owner.
  const { error: linkError } = await admin.from('campground_admins').insert({
    campground_id: cg.id,
    user_id: userId,
    role: 'owner',
  })
  if (linkError) {
    console.error('[stripe/webhook] campground_admins insert failed:', linkError.message)
  }

  // 4. Issue a magic link for the dashboard.
  const origin = getSiteOrigin(request.headers)
  let magicLink = `${origin}/owner/login`
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: submission.email,
    options: { redirectTo: `${origin}/owner/dashboard` },
  })
  if (linkData?.properties?.action_link) {
    magicLink = linkData.properties.action_link
  }

  // 5. Build the QR check-in URL. The campground_qr_tokens row was
  // auto-created by the existing trigger when the campground was
  // inserted; we just need the token value.
  const { data: tokenRow } = await admin
    .from('campground_qr_tokens')
    .select('token')
    .eq('campground_id', cg.id)
    .maybeSingle()
  const qrCheckInUrl = tokenRow
    ? `${origin}/checkin?token=${tokenRow.token}`
    : `${origin}/checkin`

  // 6. Send the onboarding kit email.
  await sendOwnerOnboardingKitEmail({
    toEmail: submission.email,
    ownerName: submission.owner_name,
    campgroundName: submission.campground_name,
    qrCheckInUrl,
    dashboardMagicLink: magicLink,
  })

  // 7. Mark the submission provisioned.
  await admin
    .from('owner_signup_submissions')
    .update({
      status: 'provisioned',
      campground_id: cg.id,
      provisioned_user_id: userId,
    })
    .eq('id', submission.id)
}

async function handleSubscriptionChanged(sub: Stripe.Subscription) {
  const admin = createSupabaseAdminClient()
  const status = mapStripeStatus(sub.status)
  // Newer Stripe API moved current_period_end from Subscription to
  // SubscriptionItem. Read it from the first item.
  const itemEnd = sub.items.data[0]?.current_period_end
  const periodEnd =
    typeof itemEnd === 'number' ? new Date(itemEnd * 1000).toISOString() : null
  const plan = mapStripePlanFromSubscription(sub)
  await admin
    .from('campgrounds')
    .update({
      subscription_status: status,
      current_period_end: periodEnd,
      ...(plan ? { plan } : {}),
    })
    .eq('stripe_subscription_id', sub.id)
}

async function handleSubscriptionCanceled(sub: Stripe.Subscription) {
  const admin = createSupabaseAdminClient()
  await admin
    .from('campgrounds')
    .update({ subscription_status: 'canceled' })
    .eq('stripe_subscription_id', sub.id)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const admin = createSupabaseAdminClient()
  // Stripe moved invoice.subscription off the top level. Try modern
  // location first (invoice.parent.subscription_details.subscription),
  // fall back to legacy fields via cast for older payloads.
  const sid = extractSubscriptionId(invoice)
  if (!sid) return
  await admin
    .from('campgrounds')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_subscription_id', sid)
}

function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
  // Modern path: invoice.parent.subscription_details.subscription.
  const parent = (invoice as unknown as {
    parent?: {
      subscription_details?: { subscription?: string | { id?: string } | null }
    }
  }).parent
  const fromParent = parent?.subscription_details?.subscription
  if (typeof fromParent === 'string') return fromParent
  if (fromParent && typeof fromParent === 'object' && 'id' in fromParent) {
    return fromParent.id ?? null
  }
  // Legacy path: invoice.subscription (deprecated but still present
  // on some payloads).
  const legacy = (invoice as unknown as {
    subscription?: string | { id?: string } | null
  }).subscription
  if (typeof legacy === 'string') return legacy
  if (legacy && typeof legacy === 'object' && 'id' in legacy) {
    return legacy.id ?? null
  }
  return null
}

function mapStripeStatus(
  status: Stripe.Subscription.Status,
): 'trial' | 'active' | 'past_due' | 'canceled' {
  switch (status) {
    case 'trialing':
      return 'trial'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    default:
      return 'active'
  }
}

function mapStripePlanFromSubscription(
  sub: Stripe.Subscription,
): 'monthly' | 'annual' | null {
  const item = sub.items.data[0]
  if (!item) return null
  const interval = item.price?.recurring?.interval
  if (interval === 'month') return 'monthly'
  if (interval === 'year') return 'annual'
  return null
}

// Generate a slug from the campground name + a numeric suffix if the
// base slug already exists. Slug pattern: lowercase, hyphens, ASCII.
async function uniqueSlugFor(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  name: string,
): Promise<string> {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'campground'
  let candidate = base
  let suffix = 1
  // Bounded loop — should rarely iterate more than once.
  while (suffix < 100) {
    const { data } = await admin
      .from('campgrounds')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
    suffix += 1
    candidate = `${base}-${suffix}`
  }
  return `${base}-${Date.now()}`
}
