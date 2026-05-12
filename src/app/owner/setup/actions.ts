'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRequestIp } from '@/lib/utils'
import {
  PARTNER_TERMS_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '@/lib/constants/interests'

export type OwnerSetupState = { error: string | null }

const schema = z.object({
  display_name: z.string().min(1).max(120),
  campground_name: z.string().min(1).max(120),
  city: z.string().max(80).optional().or(z.literal('')),
  region: z.string().max(80).optional().or(z.literal('')),
  website: z
    .string()
    .url({ message: 'Enter a valid website (e.g. www.yourcampground.com).' })
    .or(z.literal('')),
  phone: z.string().max(60).optional().or(z.literal('')),
  accept_partner_terms: z.boolean().refine((v) => v === true, {
    message: 'You must agree to the Partner Terms and Conduct Restrictions.',
  }),
  confirm_18_and_authorized: z.boolean().refine((v) => v === true, {
    message:
      'You must confirm you are 18+ and authorized to represent the campground.',
  }),
})

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'campground'
  )
}

// Pick a slug that isn't already taken in campgrounds.slug. The previous
// scheme appended userId.slice(0,6) — that collides on the second insert
// for the same owner with the same campground name. We now suffix with
// the user id slice on the first attempt (back-compat for existing rows)
// and fall back to numeric + timestamp suffixes if it's still taken.
async function uniqueSlugFor(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  name: string,
  userId: string,
): Promise<string> {
  const base = slugify(name)
  const userTail = userId.replace(/-/g, '').slice(0, 6)
  const candidates: string[] = [`${base}-${userTail}`]
  for (let i = 2; i <= 20; i++) candidates.push(`${base}-${userTail}-${i}`)
  candidates.push(`${base}-${userTail}-${Date.now().toString(36).slice(-6)}`)

  for (const candidate of candidates) {
    const { data } = await admin
      .from('campgrounds')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
  }
  // Extremely unlikely fallback.
  return `${base}-${Date.now().toString(36)}`
}

// Mirrors the username scheme from /owner/signup actions: 24 chars max,
// alphanumeric + underscore, derived from the user id so it's stable.
function makeUsername(userId: string): string {
  const tail = userId.replace(/-/g, '').slice(0, 18)
  return `owner_${tail}`
}

// Provisions a campground for an already-authenticated user. Used by the
// post-OAuth setup page. The user already has an auth.users row + a profile
// row (created by the handle_new_user trigger), so this only needs to:
//   1. Set role='owner' + display_name + a clean username on profiles.
//   2. Create the campground.
//   3. Link via campground_admins (host first, upgrade to owner).
//   4. Seed the QR token.
export async function ownerSetupAction(
  _prev: OwnerSetupState,
  formData: FormData,
): Promise<OwnerSetupState> {
  // Normalize scheme-less website input ("www.yourcampground.com") by
  // prepending https:// before zod's .url() check. The form invites
  // scheme-less entry, so we have to be tolerant on the server.
  const websiteRaw = String(formData.get('website') ?? '').trim()
  const websiteNormalized = websiteRaw
    ? /^https?:\/\//i.test(websiteRaw)
      ? websiteRaw
      : `https://${websiteRaw}`
    : ''

  const parsed = schema.safeParse({
    display_name: formData.get('display_name'),
    campground_name: formData.get('campground_name'),
    city: formData.get('city') ?? '',
    region: formData.get('region') ?? '',
    website: websiteNormalized,
    phone: formData.get('phone') ?? '',
    accept_partner_terms: formData.get('accept_partner_terms') === 'on',
    confirm_18_and_authorized:
      formData.get('confirm_18_and_authorized') === 'on',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ?? 'Check your fields and try again.'
    return { error: String(first) }
  }
  const { display_name, campground_name, city, region, website, phone } = parsed.data

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Your session expired — please sign in again.' }
  }
  const userId = user.id
  const ownerEmail = user.email ?? ''

  const admin = createSupabaseAdminClient()
  const h = await headers()

  // If they already manage any campground (double-submit, refresh, or a
  // returning owner who somehow re-entered the setup form), short-circuit.
  // .limit(1) on an array — .maybeSingle() silently returns null when
  // the user has more than one admin row, which previously caused setup
  // to keep adding rows and looping.
  const { data: existingLinks } = await admin
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', userId)
    .limit(1)
  if (existingLinks && existingLinks.length > 0) {
    console.info('[owner-setup] short-circuit — user already has admin link', {
      user_id_prefix: userId.slice(0, 8),
    })
    redirect('/owner/dashboard')
  }

  // Recovery: if a campground already exists for this owner_email (e.g.
  // Stripe webhook created the campground but the admin-link insert
  // failed), link to that instead of creating a duplicate row.
  if (ownerEmail) {
    const { data: orphanCgs } = await admin
      .from('campgrounds')
      .select('id, slug')
      .eq('owner_email', ownerEmail)
      .order('created_at', { ascending: false })
      .limit(1)
    const orphanCg = orphanCgs?.[0]
    if (orphanCg) {
      const { error: linkErr } = await admin
        .from('campground_admins')
        .insert({
          campground_id: orphanCg.id,
          user_id: userId,
          role: 'owner',
        })
      if (!linkErr) {
        console.info('[owner-setup] recovered orphaned campground link', {
          user_id_prefix: userId.slice(0, 8),
          campground_id_prefix: orphanCg.id.slice(0, 8),
          slug: orphanCg.slug,
        })
        redirect('/owner/dashboard')
      }
      console.warn('[owner-setup] orphan recovery insert failed', {
        message: linkErr.message,
      })
    }
  }

  // 0) Record acceptance of Partner Terms (and the general Terms +
  // Privacy versions implicit in account creation).
  const { error: ackError } = await admin.from('legal_acks').insert({
    user_id: userId,
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
    partner_terms_version: PARTNER_TERMS_VERSION,
    ip_address: getRequestIp(h),
    user_agent: h.get('user-agent'),
  })
  if (ackError) {
    console.error('[owner-setup] legal_acks insert failed:', ackError.message)
    // Non-fatal — proceed with provisioning.
  }

  // 1) Update profile — role + display_name. Upgrade username to owner_xxx
  // (the trigger creates one like rv_xxx by default; renaming is cleaner).
  const username = makeUsername(userId)
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ username, display_name, role: 'owner' })
    .eq('id', userId)
  if (profileErr) {
    console.error('[owner-setup] profile update failed:', profileErr.message)
    return { error: `Profile update failed: ${profileErr.message}` }
  }

  // 2) Create campground. Slug is collision-checked against existing
  // rows before insert — the previous scheme of `{name}-{userId[:6]}`
  // collided when the same owner reused a campground name across tests.
  const slug = await uniqueSlugFor(admin, campground_name, userId)
  const { data: campground, error: cgError } = await admin
    .from('campgrounds')
    .insert({
      name: campground_name,
      slug,
      owner_email: ownerEmail,
      city: city || null,
      region: region || null,
      website: website || null,
      phone: phone || null,
      is_active: true,
    })
    .select('id')
    .single()
  if (cgError || !campground) {
    console.error('[owner-setup] campground insert failed', {
      user_id_prefix: userId.slice(0, 8),
      slug,
      message: cgError?.message ?? '(no row returned)',
    })
    return {
      error:
        "Sorry — we couldn't create your campground. Try a slightly different name, or email hello@getroadwave.com.",
    }
  }
  const campgroundId = campground.id
  console.info('[owner-setup] campground created', {
    user_id_prefix: userId.slice(0, 8),
    campground_id_prefix: campgroundId.slice(0, 8),
    slug,
  })

  // 3) Link admin (host first; upgrade to owner once 0011 is applied).
  const { error: adminError } = await admin.from('campground_admins').insert({
    campground_id: campgroundId,
    user_id: userId,
    role: 'host',
  })
  if (adminError) {
    console.error('[owner-setup] campground_admins insert failed', {
      user_id_prefix: userId.slice(0, 8),
      campground_id_prefix: campgroundId.slice(0, 8),
      message: adminError.message,
    })
    await admin.from('campgrounds').delete().eq('id', campgroundId)
    return {
      error:
        "Sorry — we couldn't link your account to that campground. Please try again, or email hello@getroadwave.com.",
    }
  }

  const { error: upgradeError } = await admin
    .from('campground_admins')
    .update({ role: 'owner' })
    .eq('campground_id', campgroundId)
    .eq('user_id', userId)
  if (upgradeError) {
    console.warn(
      "[owner-setup] couldn't upgrade campground_admins.role to 'owner':",
      upgradeError.message,
    )
  }

  // 4) Seed QR token (best effort).
  const { error: tokenError } = await admin
    .from('campground_qr_tokens')
    .insert({ campground_id: campgroundId })
  if (tokenError) {
    console.warn('[owner-setup] qr token insert failed (non-fatal):', tokenError.message)
  }

  redirect('/owner/dashboard')
}
