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

  // Idempotency gate — stripe_events.stripe_event_id is UNIQUE. Insert
  // first; if PG reports a duplicate-key violation we've already
  // processed this event and we can return 200 without re-firing the
  // side effects. Stripe retries the same event on a backoff schedule
  // when a handler is slow or returns non-2xx, so this guard is the
  // only thing standing between us and duplicate emails / duplicate
  // user provisioning attempts.
  const admin = createSupabaseAdminClient()
  const { error: idemError } = await admin.from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
  })
  if (idemError) {
    // 23505 = unique_violation in Postgres. Anything else is unexpected
    // and we should surface it.
    const code = (idemError as { code?: string }).code
    if (code === '23505') {
      // Already processed — silently 200.
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error(
      '[stripe/webhook] stripe_events insert failed:',
      idemError.message,
    )
    // Continue anyway — losing idempotency is better than losing the
    // event. Worst case we re-fire a side effect on Stripe's next
    // retry; most of our side effects are themselves idempotent.
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
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
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
    // Roll back the idempotency row so Stripe's retry re-runs the
    // handler. Otherwise we'd swallow a failed handler silently.
    await admin
      .from('stripe_events')
      .delete()
      .eq('stripe_event_id', event.id)
    return new NextResponse('handler error', { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// invoice.paid keeps the subscription in the active state. Stripe
// fires this on initial activation (after a successful trial-end
// charge) and on every renewal. We flip past_due → active when a
// past-due invoice clears, and refresh current_period_end while
// we're here.
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const admin = createSupabaseAdminClient()
  const sid = extractSubscriptionId(invoice)
  if (!sid) return

  // Read the latest subscription period end from the invoice line
  // items if the invoice carries one; otherwise leave it untouched.
  const lineEnd = invoice.lines?.data?.[0]?.period?.end
  const periodEnd =
    typeof lineEnd === 'number'
      ? new Date(lineEnd * 1000).toISOString()
      : null

  const update: Record<string, unknown> = { subscription_status: 'active' }
  if (periodEnd) update.current_period_end = periodEnd

  await admin
    .from('campgrounds')
    .update(update)
    .eq('stripe_subscription_id', sid)
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
    // Walk every page of listUsers until we find the email or run out.
    // The previous version only checked page 1 (default 50), which
    // silently dropped users past that boundary and left them
    // orphaned with no campground_admins row.
    userId = await findAuthUserIdByEmail(admin, submission.email)
  } else if (createError) {
    console.error('[stripe/webhook] createUser failed:', createError.message)
    return
  }
  if (!userId) {
    console.error('[stripe/webhook] could not resolve userId for submission', {
      submission_id_prefix: submission.id.slice(0, 8),
    })
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
      // 30-day trial — mirrors trial_period_days in stripe/checkout/route.ts.
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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

  // 3b. Promote profiles.role to 'owner'. The handle_new_user trigger
  // creates the profile row with role='guest' by default; without this
  // update the /owner/(authed) layout bounces the user to /checkin on
  // their first dashboard visit because role='guest' is treated as a
  // camper. Symptom in production: the "Open Your Dashboard" link in
  // the onboarding email lands the owner on the camper check-in flow.
  // Mirrors the same role-promotion done by /owner/setup and the
  // manual recovery action in provisionCampgroundAction.
  const { error: roleError } = await admin
    .from('profiles')
    .update({ role: 'owner' })
    .eq('id', userId)
  if (roleError) {
    console.error('[stripe/webhook] profiles.role update failed:', roleError.message)
  }

  // 4. Issue a magic link for the dashboard.
  //
  // The email's CTA does NOT point at the raw Supabase action_link.
  // Gmail / Outlook / corporate gateways pre-fetch every URL in an
  // incoming email for malware scanning; that pre-fetch consumes
  // any single-use OTP embedded in the link, and the human lands on
  // "otp_expired" the moment they actually click. We instead route
  // them to our own /auth/sign-in page which renders a form. The
  // hashed_token is consumed only when the human submits the form
  // — scanners don't submit forms.
  const origin = getSiteOrigin(request.headers)
  let magicLink = `${origin}/owner/login`
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: submission.email,
    options: { redirectTo: `${origin}/owner/dashboard` },
  })
  if (linkData?.properties?.hashed_token) {
    const params = new URLSearchParams({
      th: linkData.properties.hashed_token,
      email: submission.email,
      next: '/owner/dashboard',
    })
    magicLink = `${origin}/auth/sign-in?${params.toString()}`
  } else if (linkData?.properties?.action_link) {
    // Old SDKs that don't expose hashed_token — fall through to the
    // legacy URL. Scanner risk applies, but better than no link.
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
    ? `${origin}/campground/${cg.slug}?token=${tokenRow.token}`
    : `${origin}/campground/${cg.slug}`

  // 6. Send the onboarding kit email.
  await sendOwnerOnboardingKitEmail({
    toEmail: submission.email,
    ownerName: submission.owner_name,
    campgroundName: submission.campground_name,
    qrCheckInUrl,
    dashboardMagicLink: magicLink,
  })

  // 6b. Best-effort internal alert to RoadWave admin. Fires AFTER the
  // owner-onboarding email so the owner-facing email is always the
  // critical path. Wrapped in try/catch so a failed alert never
  // bubbles up into a 5xx on the webhook — the founder's inbox
  // getting rate-limited shouldn't cause Stripe to retry a real
  // signup. Recipient resolution lives inside the helper (reads
  // INTERNAL_NEW_OWNER_NOTIFY_EMAIL env var; defaults to
  // hello@getroadwave.com). Stripe idempotency at the top of the
  // webhook means a Stripe retry of the same event id skips this
  // whole handler, so the alert can't double-fire.
  try {
    const { sendInternalNewOwnerAlert } = await import(
      '@/lib/email/internal-new-owner-alert'
    )
    await sendInternalNewOwnerAlert({
      campgroundName: submission.campground_name,
      campgroundSlug: cg.slug,
      ownerEmail: submission.email,
      ownerName: submission.owner_name,
      signupAt: new Date(),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'trial',
      plan,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      campgroundUrl: `${origin}/campground/${cg.slug}`,
      adminCampgroundsUrl: `${origin}/admin/campgrounds`,
    })
  } catch (err) {
    console.warn(
      '[stripe/webhook] internal new-owner alert failed (non-fatal):',
      err instanceof Error ? err.message : String(err),
    )
  }

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

  // Look up the campground first so we have the owner email + name for
  // the notification email. The status update can happen either way.
  const { data: cg } = await admin
    .from('campgrounds')
    .select('id, name, owner_email')
    .eq('stripe_subscription_id', sid)
    .maybeSingle<{ id: string; name: string; owner_email: string | null }>()

  await admin
    .from('campgrounds')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_subscription_id', sid)

  if (!cg?.owner_email) return

  // Format the failed amount. Stripe gives us minor units (cents).
  const amountDue =
    typeof invoice.amount_due === 'number'
      ? invoice.amount_due
      : 0
  const currency = (invoice.currency ?? 'usd').toUpperCase()
  const amountFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amountDue / 100)

  // Stripe customer portal session for this customer.
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer?.id ?? null)

  // Best-effort portal URL. If portal session creation fails, fall back
  // to a generic /owner/billing link — the owner can land there and
  // click through.
  const siteOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
  let portalUrl = `${siteOrigin}/owner/billing`
  try {
    if (customerId) {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (stripeKey) {
        const stripeClient = (await import('stripe')).default
        const stripe = new stripeClient(stripeKey)
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${siteOrigin}/owner/billing`,
        })
        if (session.url) portalUrl = session.url
      }
    }
  } catch (err) {
    console.warn(
      '[stripe/webhook] portal session create failed for payment-failed email:',
      err instanceof Error ? err.message : String(err),
    )
  }

  const { sendPaymentFailedEmail } = await import('@/lib/email/payment-failed')
  await sendPaymentFailedEmail({
    toEmail: cg.owner_email,
    ownerName: null,
    campgroundName: cg.name,
    amountFormatted,
    portalUrl,
  })
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

// Walk every page of admin.auth.admin.listUsers until we find a user
// with the given email, or run out of pages. Replaces the previous
// single-page lookup which silently lost users beyond page 1.
async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
): Promise<string | null> {
  const perPage = 200
  // Hard ceiling so a misbehaving call can't loop forever.
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('[stripe/webhook] listUsers failed', { page, message: error.message })
      return null
    }
    const hit = data?.users.find((u) => u.email === email)
    if (hit) return hit.id
    if (!data?.users || data.users.length < perPage) return null
  }
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
