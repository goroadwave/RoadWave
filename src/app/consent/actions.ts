'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  COMMUNITY_RULES_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '@/lib/constants/interests'
import { getRequestIp } from '@/lib/utils'

export type ConsentState = { error: string | null }

// Same shape as the email-signup ack — every checkbox must be true.
const schema = z.object({
  confirm_18: z.boolean().refine((v) => v === true, {
    message: 'You must confirm you are 18 or older.',
  }),
  accept_terms: z.boolean().refine((v) => v === true, {
    message: 'You must accept the Terms of Service.',
  }),
  accept_privacy: z.boolean().refine((v) => v === true, {
    message: 'You must accept the Privacy Policy.',
  }),
  accept_community_rules: z.boolean().refine((v) => v === true, {
    message: 'You must agree to the Community Rules.',
  }),
})

// Validates an internal redirect path so an attacker can't redirect a
// freshly-consented user off-site via ?next=https://evil.example.
function safeNext(raw: FormDataEntryValue | null): string {
  if (typeof raw !== 'string') return '/home'
  if (!raw.startsWith('/')) return '/home'
  if (raw.startsWith('//')) return '/home'
  return raw
}

export async function recordConsentAction(
  _prev: ConsentState,
  formData: FormData,
): Promise<ConsentState> {
  const parsed = schema.safeParse({
    confirm_18: formData.get('confirm_18') === 'on',
    accept_terms: formData.get('accept_terms') === 'on',
    accept_privacy: formData.get('accept_privacy') === 'on',
    accept_community_rules: formData.get('accept_community_rules') === 'on',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ??
      'Check every box to continue.'
    return { error: String(first) }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Your session expired — sign in again.' }
  }

  const admin = createSupabaseAdminClient()
  const h = await headers()

  // If a legal_acks row already exists for this user, don't insert a
  // second one. Treat as success and forward to next. Idempotent against
  // a double-submit or browser back-then-forward.
  const { data: existing } = await admin
    .from('legal_acks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!existing) {
    // Per-field consent timestamps (per migration 0036). All four are
    // set to `now` because the user gave every consent simultaneously
    // by submitting the /consent form.
    const consentNow = new Date().toISOString()
    const { error: insertErr } = await admin.from('legal_acks').insert({
      user_id: user.id,
      age_confirmed: true,
      accepted_terms: true,
      accepted_rules: true,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      community_rules_version: COMMUNITY_RULES_VERSION,
      confirmed_18_at: consentNow,
      accepted_terms_at: consentNow,
      accepted_privacy_at: consentNow,
      accepted_community_rules_at: consentNow,
      ip_address: getRequestIp(h),
      user_agent: h.get('user-agent'),
    })
    if (insertErr) {
      console.error('[consent] legal_acks insert failed:', insertErr.message)
      return { error: 'Could not record consent. Try again.' }
    }
  }

  redirect(safeNext(formData.get('next')))
}
