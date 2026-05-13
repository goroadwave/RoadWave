'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isQuickCheckInSlug } from '@/lib/checkin/quick-checkin-slugs'
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '@/lib/constants/interests'

// Set by the proxy when a camper opens /campground/<slug>?token=<uuid>.
// The (app) layout reads this after auth and redirects to /checkin?token=
// if it's still set. After a successful /quickcheckin we own the
// check-in already, so this bridge cookie must be cleared before the
// redirect to /home — otherwise the (app) layout bounces the camper
// into /checkin which then renders the standard "confirm check-in"
// flow they don't need.
const PENDING_CHECKIN_COOKIE = 'pending_checkin_token'

export type QuickCheckInState = { error: string | null }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Visibility modes available in the quick-checkin form. Maps directly
// to the privacy_mode enum; "campground_updates_only" is intentionally
// omitted here — the spec calls for three options (Visible / Quiet /
// Invisible).
const VISIBILITY_VALUES = ['visible', 'quiet', 'invisible'] as const

const schema = z.object({
  slug: z.string().min(1),
  token: z.string().regex(UUID_RE),
  visibility: z.enum(VISIBILITY_VALUES),
  interests: z.array(z.string().min(1).max(40)).max(20),
  accept_terms: z.literal('on'),
})

// Random throwaway local-part for the auth.users email. @example.com
// is a reserved TLD that cannot deliver mail, so these accounts can
// never be recovered, contacted, or confused for real users.
function makeDemoEmail(): string {
  const rand =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  return `quickcheckin-${rand}@example.com`
}

function makeRandomPassword(): string {
  // 32 bytes of randomness encoded as a long alphanumeric. Never
  // shown to the human, never reused — just satisfies the auth.users
  // password requirement for the one-shot signInWithPassword below.
  const a = crypto.randomUUID().replace(/-/g, '')
  const b = crypto.randomUUID().replace(/-/g, '')
  return `${a}${b}`
}

function makeUsername(userId: string): string {
  // 24-char alphanumeric+underscore — matches the profiles.username
  // CHECK constraint (^[a-zA-Z0-9_]{3,24}$). Derived from the auth id
  // so two demo campers can never collide.
  const tail = userId.replace(/-/g, '').slice(0, 18)
  return `rv_${tail}`
}

/**
 * Public, no-signup check-in for allow-listed test campgrounds.
 *
 * Flow:
 *   1. Validate slug is in QUICK_CHECKIN_SLUGS.
 *   2. Validate token matches the campground via campground_qr_tokens.
 *   3. Create a throwaway auth user (admin client, email_confirm=true).
 *   4. Update the trigger-created profile row with visibility +
 *      stable username + role='guest'.
 *   5. Insert profile_interests for the chosen interest slugs.
 *   6. Insert legal_acks so the (app) layout consent gate is
 *      satisfied when the camper lands on /home.
 *   7. supabase.auth.signInWithPassword on the server client — this
 *      writes the session cookie via next/headers cookies(), giving
 *      the just-created user a valid session.
 *   8. Insert the check_in row (admin client, since the session
 *      cookie was set this turn and the RLS-aware client may not
 *      see it yet within the same action).
 *   9. Log check_in_started + check_in_completed events.
 *  10. redirect('/home').
 *
 * Idempotent on repeat clicks only in the sense that the form
 * resubmission would create another camper — there is no "resume"
 * path. The form's pending-state UI prevents accidental double-fire.
 */
export async function quickCheckInAction(
  _prev: QuickCheckInState,
  formData: FormData,
): Promise<QuickCheckInState> {
  // ── 1. Validate form input + slug allow-list ───────────────────────
  const parsed = schema.safeParse({
    slug: formData.get('slug'),
    token: formData.get('token'),
    visibility: formData.get('visibility'),
    interests: formData.getAll('interests').map(String),
    accept_terms: formData.get('accept_terms'),
  })
  if (!parsed.success) {
    return {
      error:
        'Please pick a visibility option and agree to the privacy notice before continuing.',
    }
  }
  const { slug, token, visibility, interests } = parsed.data

  if (!isQuickCheckInSlug(slug)) {
    // Demo flow not enabled for this slug — fall back to the standard
    // /signup gate. Should not be reachable from the standard UI; the
    // welcome page only routes allow-listed slugs here.
    return {
      error:
        'This campground requires a standard RoadWave account. Sign up at /signup to check in.',
    }
  }

  // ── 2. Resolve campground from token ───────────────────────────────
  const admin = createSupabaseAdminClient()
  const { data: tokenRow } = await admin
    .from('campground_qr_tokens')
    .select('campground_id')
    .eq('token', token)
    .maybeSingle<{ campground_id: string }>()
  if (!tokenRow?.campground_id) {
    return { error: "That QR doesn't match a known campground." }
  }
  const campgroundId = tokenRow.campground_id

  // Cross-check: the token must belong to the slug claimed by the
  // form. Otherwise a valid-but-different-campground token paired
  // with an allow-listed slug could spoof which campground the
  // check-in lands at.
  const { data: cg } = await admin
    .from('campgrounds')
    .select('id, slug, name, is_active')
    .eq('id', campgroundId)
    .maybeSingle<{ id: string; slug: string; name: string; is_active: boolean }>()
  if (!cg || !cg.is_active || cg.slug !== slug) {
    return { error: "That campground isn't accepting check-ins right now." }
  }

  // ── 3. Provision throwaway auth user ────────────────────────────────
  const email = makeDemoEmail()
  const password = makeRandomPassword()
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        signup_source: 'quickcheckin',
        campground_slug: slug,
      },
    })
  if (createError || !created?.user) {
    console.error(
      '[quickcheckin] createUser failed:',
      createError?.message ?? 'unknown',
    )
    return { error: "We couldn't set up your demo check-in. Try again." }
  }
  const userId = created.user.id

  // ── 4. Update profile row created by handle_new_user trigger ───────
  //
  // travel_style is set to a benign default ("Weekender") so the /home
  // WelcomeModal doesn't fire — that modal walks the camper through
  // selecting a travel style and interests, which isn't the flow we
  // want post-quickcheckin (the camper just picked their interests
  // on the quickcheckin form). They can edit travel_style from
  // /profile/setup later if they want.
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      username: makeUsername(userId),
      display_name: 'Demo Camper',
      role: 'guest',
      privacy_mode: visibility,
      travel_style: 'Weekender',
    })
    .eq('id', userId)
  if (profileError) {
    console.warn('[quickcheckin] profile update failed:', profileError.message)
    // Non-fatal — defaults still apply.
  }

  // ── 5. profile_interests for selected chips ────────────────────────
  if (interests.length > 0) {
    const { data: interestRows } = await admin
      .from('interests')
      .select('id, slug')
      .in('slug', interests)
      .returns<{ id: number; slug: string }[]>()
    const linkRows = (interestRows ?? []).map((i) => ({
      profile_id: userId,
      interest_id: i.id,
    }))
    if (linkRows.length > 0) {
      const { error: piError } = await admin
        .from('profile_interests')
        .upsert(linkRows, { onConflict: 'profile_id,interest_id' })
      if (piError) {
        console.warn(
          '[quickcheckin] profile_interests upsert failed:',
          piError.message,
        )
      }
    }
  }

  // ── 6. legal_acks so the (app) layout consent gate is satisfied ────
  const { error: ackError } = await admin.from('legal_acks').insert({
    user_id: userId,
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
  })
  if (ackError) {
    console.warn('[quickcheckin] legal_acks insert failed:', ackError.message)
  }

  // ── 7. Sign in via cookie session ──────────────────────────────────
  const supabase = await createSupabaseServerClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) {
    console.error('[quickcheckin] signInWithPassword failed:', signInError.message)
    return { error: "Couldn't sign in to your demo session. Try again." }
  }

  // ── 8. Write the check_in row ──────────────────────────────────────
  const nowIso = new Date().toISOString()
  const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { error: checkInError } = await admin.from('check_ins').insert({
    profile_id: userId,
    campground_id: campgroundId,
    checked_in_at: nowIso,
    expires_at: expiresIso,
    status: 'active',
  })
  if (checkInError) {
    console.error('[quickcheckin] check_in insert failed:', checkInError.message)
    return { error: "Check-in didn't save. Try again." }
  }

  // ── 9. Log lifecycle events (best-effort) ──────────────────────────
  for (const eventType of ['check_in_started', 'check_in_completed'] as const) {
    const { error } = await admin.from('campground_events').insert({
      campground_id: campgroundId,
      event_type: eventType,
    })
    if (error) {
      // Most likely: migration 0041 hasn't been applied yet → CHECK
      // constraint violation. Log + continue; the check-in itself is
      // already saved.
      console.warn(
        `[quickcheckin] ${eventType} event log failed:`,
        error.message,
      )
    }
  }

  // Clear the QR bridge cookie before redirect. Without this, the
  // (app) layout's pending_checkin_token gate fires on /home and
  // bounces the camper into /checkin?token=…, which renders the
  // standard "confirm check-in" UI for a check-in they've already
  // completed — the symptom is "I tapped Complete Check-In and saw
  // only the footer / wrong screen."
  const jar = await cookies()
  jar.delete(PENDING_CHECKIN_COOKIE)

  revalidatePath('/owner/dashboard')
  revalidatePath('/admin/activity')
  redirect('/home')
}
