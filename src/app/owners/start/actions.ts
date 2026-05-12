'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { isPlan } from '@/lib/stripe/prices'
import { isStripeConfigured } from '@/lib/stripe/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRequestIp } from '@/lib/utils'

// Owner pilot intake — the canonical self-serve entry to RoadWave.
// Flow:
//   1. Owner fills the intake form on /owners/start.
//   2. This action validates + saves an owner_signup_submissions row
//      (status='new'). No auth user is created yet — that happens in
//      the Stripe webhook after a successful checkout.
//   3. Redirect to /api/stripe/checkout?submission_id=...&plan=...
//      which creates the Stripe Checkout Session and 303s the visitor
//      to Stripe's hosted checkout.
//   4. Stripe success_url → /owners/success?session_id=...
//      Stripe cancel_url  → /owners/start?checkout=cancelled
//   5. The webhook (handleCheckoutCompleted) creates the auth user,
//      campground row, and admin link, then emails the onboarding kit.
//
// When Stripe isn't configured (e.g. local dev without env vars), the
// action gracefully falls back to a "pending Stripe setup" landing so
// the funnel still works for testing the form half.

const INTERESTS = [
  'more_google_reviews',
  'repeat_bookings',
  'guest_updates',
  'contact_office',
  'private_stay_feedback',
  'optional_camper_connection',
] as const

const optionalUrl = z
  .string()
  .max(500)
  .transform((s) => s.trim())
  .refine(
    (s) => s === '' || /^https?:\/\/[^\s]+$/i.test(s),
    'Must be a full https:// URL',
  )
  .transform((s) => (s === '' ? null : s))
  .nullable()
  .optional()

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional()

const ackTrue = z.preprocess(
  (v) => v === 'on' || v === true,
  z.literal(true, {
    message: 'Please confirm each acknowledgement to continue.',
  }),
)

const schema = z.object({
  campground_name: z.string().min(1).max(200),
  contact_name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: optionalText(60),
  website: optionalUrl,
  booking_url: optionalUrl,
  review_url: optionalUrl,
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  interests: z
    .array(z.enum(INTERESTS))
    .max(INTERESTS.length)
    .transform((arr) => Array.from(new Set(arr))),
  plan: z.enum(['monthly', 'annual']),
  accepted_partner_terms: ackTrue,
  ack_optional: ackTrue,
  ack_no_site_numbers: ackTrue,
  ack_not_emergency: ackTrue,
})

export type OwnerPilotIntakeState = {
  error: string | null
  ok: boolean
}

export async function submitOwnerPilotIntakeAction(
  _prev: OwnerPilotIntakeState,
  formData: FormData,
): Promise<OwnerPilotIntakeState> {
  const parsed = schema.safeParse({
    campground_name: formData.get('campground_name') ?? '',
    contact_name: formData.get('contact_name') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    website: formData.get('website') ?? '',
    booking_url: formData.get('booking_url') ?? '',
    review_url: formData.get('review_url') ?? '',
    city: formData.get('city') ?? '',
    state: formData.get('state') ?? '',
    interests: formData.getAll('interests'),
    plan: formData.get('plan') ?? 'monthly',
    accepted_partner_terms: formData.get('accepted_partner_terms'),
    ack_optional: formData.get('ack_optional'),
    ack_no_site_numbers: formData.get('ack_no_site_numbers'),
    ack_not_emergency: formData.get('ack_not_emergency'),
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ??
      flat.formErrors[0] ??
      'Please check the form.'
    return { error: String(first), ok: false }
  }

  const data = parsed.data
  if (!isPlan(data.plan)) return { error: 'Invalid plan.', ok: false }

  // Persist the submission. No auth user created yet — the Stripe
  // webhook does that after a successful checkout, so abandoned
  // checkouts don't leave orphan auth users behind.
  const headerList = await headers()
  const admin = createSupabaseAdminClient()
  const { data: row, error } = await admin
    .from('owner_signup_submissions')
    .insert({
      campground_name: data.campground_name,
      owner_name: data.contact_name,
      email: data.email,
      phone: data.phone,
      website: data.website,
      booking_url: data.booking_url,
      review_url: data.review_url,
      city: data.city,
      state: data.state,
      interests: data.interests,
      accepted_partner_terms: true,
      ack_optional: true,
      ack_no_site_numbers: true,
      ack_not_emergency: true,
      ip_address: getRequestIp(headerList),
      user_agent: headerList.get('user-agent'),
    })
    .select('id')
    .single()
  if (error || !row) {
    console.error('[owners/start] submission insert failed:', error?.message)
    return {
      error:
        error?.message ?? 'Could not save your submission. Please try again.',
      ok: false,
    }
  }

  if (!isStripeConfigured()) {
    // Graceful fallback — show the success card so the form half is
    // still usable in local dev / preview envs where Stripe env vars
    // aren't wired up yet. A human will still see the lead in the
    // admin inbox and follow up manually.
    return { error: null, ok: true }
  }

  // Hand off to the Stripe Checkout creator. It will create the
  // Checkout Session, store the session id on the submission row,
  // and 303 the visitor to Stripe's hosted page.
  redirect(`/api/stripe/checkout?submission_id=${row.id}&plan=${data.plan}`)
}
