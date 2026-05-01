'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRequestIp } from '@/lib/utils'
import { isPlan } from '@/lib/stripe/prices'
import { isStripeConfigured } from '@/lib/stripe/server'

// Self-serve owner signup. Captures the spec §2 form, persists an
// owner_signup_submission row, then either redirects to Stripe
// Checkout (if STRIPE_* env vars are configured) or to the welcome
// page in "pending Stripe setup" mode (graceful fallback).
//
// No auth user is created here — that happens after payment in the
// Stripe webhook handler. Returning owners log in via /owner/login.

const schema = z.object({
  campground_name: z.string().min(1).max(200),
  owner_name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal('')),
  website: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(120).optional().or(z.literal('')),
  state: z.string().max(120).optional().or(z.literal('')),
  num_sites: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return null
      const n = typeof v === 'number' ? v : parseInt(String(v), 10)
      return Number.isFinite(n) && n >= 0 ? n : null
    }),
  campground_type: z
    .enum(['rv_park', 'resort', 'state_park', 'private', 'seasonal', 'other'])
    .optional()
    .or(z.literal('')),
  hosts_events: z.preprocess((v) => v === 'on' || v === true, z.boolean()),
  target_guests: z
    .enum(['overnight', 'seasonal', 'events', 'all'])
    .optional()
    .or(z.literal('')),
  logo_url: z.string().max(500).optional().or(z.literal('')),
  wants_setup_call: z.preprocess((v) => v === 'on' || v === true, z.boolean()),
  accepted_partner_terms: z
    .literal('on', { message: 'You must agree to the Campground Partner Terms.' })
    .or(z.boolean().refine((v) => v === true, 'You must agree to the Campground Partner Terms.')),
  ack_optional: z
    .literal('on', { message: 'Please confirm RoadWave is optional for guests.' })
    .or(z.boolean().refine((v) => v === true, 'Please confirm RoadWave is optional for guests.')),
  ack_no_site_numbers: z
    .literal('on', { message: 'Please confirm the site-number acknowledgement.' })
    .or(z.boolean().refine((v) => v === true, 'Please confirm the site-number acknowledgement.')),
  ack_not_emergency: z
    .literal('on', { message: 'Please confirm RoadWave is not an emergency service.' })
    .or(z.boolean().refine((v) => v === true, 'Please confirm RoadWave is not an emergency service.')),
  plan: z.enum(['monthly', 'annual']),
})

export type OwnerSignupState = { error: string | null }

export async function ownerSignupAction(
  _prev: OwnerSignupState,
  formData: FormData,
): Promise<OwnerSignupState> {
  const parsed = schema.safeParse({
    campground_name: formData.get('campground_name'),
    owner_name: formData.get('owner_name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? '',
    website: formData.get('website') ?? '',
    city: formData.get('city') ?? '',
    state: formData.get('state') ?? '',
    num_sites: formData.get('num_sites') ?? '',
    campground_type: formData.get('campground_type') || '',
    hosts_events: formData.get('hosts_events'),
    target_guests: formData.get('target_guests') || '',
    logo_url: (formData.get('logo_url') as string) || '',
    wants_setup_call: formData.get('wants_setup_call'),
    accepted_partner_terms: formData.get('accepted_partner_terms'),
    ack_optional: formData.get('ack_optional'),
    ack_no_site_numbers: formData.get('ack_no_site_numbers'),
    ack_not_emergency: formData.get('ack_not_emergency'),
    plan: formData.get('plan') ?? 'monthly',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ??
      flat.formErrors[0] ??
      'Please check the form and try again.'
    return { error: String(first) }
  }
  const data = parsed.data
  if (!isPlan(data.plan)) return { error: 'Invalid plan.' }

  const headerList = await headers()
  const admin = createSupabaseAdminClient()
  const { data: row, error } = await admin
    .from('owner_signup_submissions')
    .insert({
      campground_name: data.campground_name,
      owner_name: data.owner_name,
      email: data.email,
      phone: data.phone || null,
      website: data.website ? normalizeUrl(data.website) : null,
      city: data.city || null,
      state: data.state || null,
      num_sites: data.num_sites ?? null,
      campground_type: data.campground_type || null,
      hosts_events: data.hosts_events,
      target_guests: data.target_guests || null,
      logo_url: data.logo_url || null,
      wants_setup_call: data.wants_setup_call,
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
    return {
      error:
        error?.message ?? 'Could not save your submission. Please try again.',
    }
  }

  if (!isStripeConfigured()) {
    redirect(`/start/welcome?submission_id=${row.id}&pending=stripe`)
  }
  redirect(`/api/stripe/checkout?submission_id=${row.id}&plan=${data.plan}`)
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
