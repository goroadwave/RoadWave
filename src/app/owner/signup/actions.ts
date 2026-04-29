'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSiteOrigin } from '@/lib/utils'
import { headers } from 'next/headers'
import { sendOwnerSignupConfirmEmail } from '@/lib/email/signup-confirmation'

export type OwnerSignupState = { error: string | null }

const schema = z.object({
  display_name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  campground_name: z.string().min(1).max(120),
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

// profiles.username has a CHECK constraint: ^[a-zA-Z0-9_]{3,24}$. We pre-compute
// a valid username so the handle_new_user trigger uses it directly via
// raw_user_meta_data and we don't have to override it later (which is what
// caused the original bug — the override was 31 chars and silently failed
// the CHECK, leaving role at 'guest').
function makeUsername(userId: string): string {
  // 6 + 18 = 24 chars exactly. Strip dashes so it stays alphanumeric.
  const tail = userId.replace(/-/g, '').slice(0, 18)
  return `owner_${tail}`
}

export async function ownerSignupAction(
  _prev: OwnerSignupState,
  formData: FormData,
): Promise<OwnerSignupState> {
  const parsed = schema.safeParse({
    display_name: formData.get('display_name'),
    email: formData.get('email'),
    password: formData.get('password'),
    campground_name: formData.get('campground_name'),
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ?? 'Check your fields and try again.'
    return { error: String(first) }
  }
  const { display_name, email, password, campground_name } = parsed.data

  const h = await headers()
  const origin = getSiteOrigin(h)
  const admin = createSupabaseAdminClient()

  // 1) Create auth user via admin.generateLink so Supabase doesn't auto-send
  // its global confirmation email — we send a branded owner-flavored one
  // via Resend below. The handle_new_user trigger still fires on the
  // auth.users insert, so the profile row gets created the same way.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: { display_name },
      redirectTo: `${origin}/auth/callback`,
    },
  })
  if (linkError) {
    console.error('[owner-signup] generateLink failed:', linkError.message)
    return { error: linkError.message }
  }
  const confirmUrl = linkData.properties?.action_link
  const userId = linkData.user?.id
  if (!confirmUrl || !userId) {
    console.error('[owner-signup] generateLink returned no link/user id')
    return { error: "Couldn't finish signup. Try logging in." }
  }

  // 2) Confirm the auth.users row + the trigger-created profile are visible
  // to the admin client. If for any reason the trigger didn't fire, fall
  // back to an explicit insert. This guards against a missing profile row,
  // which would silently break role-based routing later.
  const { data: profileExisting } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  const username = makeUsername(userId)
  if (!profileExisting) {
    const { error: insertProfileErr } = await admin.from('profiles').insert({
      id: userId,
      username,
      display_name,
      role: 'owner',
    })
    if (insertProfileErr) {
      console.error(
        '[owner-signup] profile fallback insert failed:',
        insertProfileErr.message,
      )
      return { error: `Profile setup failed: ${insertProfileErr.message}` }
    }
  } else {
    // Update only the fields we need. Keep the trigger-set username unless
    // it's the auto-generated rv_xxx default — then upgrade it to owner_xxx
    // for cleanliness. Either way, the constraint is satisfied because
    // we never set anything > 24 chars.
    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        username,
        display_name,
        role: 'owner',
      })
      .eq('id', userId)
    if (updateErr) {
      console.error('[owner-signup] profile update failed:', updateErr.message)
      return { error: `Profile setup failed: ${updateErr.message}` }
    }
  }

  // 3) Create the campground.
  const slug = `${slugify(campground_name)}-${userId.slice(0, 6)}`
  const { data: campground, error: cgError } = await admin
    .from('campgrounds')
    .insert({
      name: campground_name,
      slug,
      owner_email: email,
      is_active: true,
    })
    .select('id')
    .single()
  if (cgError || !campground) {
    console.error(
      '[owner-signup] campground insert failed:',
      cgError?.message ?? '(no row returned)',
    )
    return { error: cgError?.message ?? "Couldn't create campground." }
  }
  const campgroundId = campground.id

  // 4) Link owner ↔ campground via campground_admins. We always insert with
  // role='host' first because that value has been in the campground_role
  // enum since 0001 — guaranteed valid regardless of whether migration
  // 0011 (which adds 'owner') has been applied. The rest of the app
  // matches on user_id alone (loadOwnerCampground), so routing works the
  // same with either role value.
  const { error: adminError } = await admin
    .from('campground_admins')
    .insert({
      campground_id: campgroundId,
      user_id: userId,
      role: 'host',
    })
  if (adminError) {
    console.error(
      '[owner-signup] campground_admins insert failed:',
      adminError.message,
    )
    // Best-effort cleanup of the orphan campground so we don't leave
    // half-provisioned data behind.
    await admin.from('campgrounds').delete().eq('id', campgroundId)
    return {
      error: `Couldn't finish linking your account to the campground: ${adminError.message}`,
    }
  }

  // 5) Best-effort upgrade to role='owner' for cleanliness. Will succeed
  // once migration 0011 is applied; will silently no-op until then.
  const { error: upgradeError } = await admin
    .from('campground_admins')
    .update({ role: 'owner' })
    .eq('campground_id', campgroundId)
    .eq('user_id', userId)
  if (upgradeError) {
    console.warn(
      "[owner-signup] couldn't upgrade campground_admins.role to 'owner' (apply 0011_fix_owner_enum.sql):",
      upgradeError.message,
    )
  }

  // 6) Verify the link is visible via a SELECT before redirecting. If the
  // dashboard's same query returns null, we want to surface that here
  // rather than dropping the user on a "No campground linked" page.
  const { data: verify } = await admin
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!verify) {
    console.error(
      '[owner-signup] verification select returned no row after insert — RLS or replication issue?',
    )
    return {
      error:
        "Account created but campground link did not persist. Try signing in.",
    }
  }

  // 7) Issue a QR token row so /owner/qr immediately works. Best effort —
  // /owner/qr surfaces a friendly fallback if the row is missing.
  const { error: tokenError } = await admin
    .from('campground_qr_tokens')
    .insert({ campground_id: campgroundId })
  if (tokenError) {
    console.warn(
      '[owner-signup] qr token insert failed (non-fatal):',
      tokenError.message,
    )
  }

  // 8) Send the branded owner-flavored confirmation email via Resend.
  // generateLink already produced the confirmation URL above without
  // triggering Supabase's global mailer.
  const sent = await sendOwnerSignupConfirmEmail({ toEmail: email, confirmUrl })
  if (!sent.ok) {
    console.error('[owner-signup] confirmation email failed:', sent.error)
    // Don't unwind: the account + campground are real and good. Surface a
    // recoverable error so the user can request a fresh email from /verify.
    return {
      error:
        "Account created but we couldn't send the confirmation email. Try requesting a new one from the verify page.",
    }
  }

  redirect(`/verify?email=${encodeURIComponent(email)}`)
}
