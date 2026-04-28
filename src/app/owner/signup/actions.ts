'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSiteOrigin } from '@/lib/utils'
import { headers } from 'next/headers'

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

  // 1) Create auth user. The signup confirmation email is bypassed if
  // Supabase is configured to auto-confirm; otherwise the user verifies
  // before they can hit /owner/dashboard (the layout redirects to /verify).
  const supabase = await createSupabaseServerClient()
  const h = await headers()
  const origin = getSiteOrigin(h)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })
  if (authError) return { error: authError.message }
  const userId = authData.user?.id
  if (!userId) {
    return { error: "Couldn't finish signup. Try logging in." }
  }

  // 2) Server-side admin client for the rest. Profile is created by a
  // trigger on auth.users insert, but we update its role + display_name
  // and create the campground + admin link.
  const admin = createSupabaseAdminClient()

  // Update profile role + display name. Username defaults via trigger; if
  // the trigger didn't fire (existing user), upsert below covers it.
  const baseUsername = slugify(display_name).replace(/-/g, '_').slice(0, 24) ||
    'owner'
  await admin.from('profiles').upsert(
    {
      id: userId,
      username: baseUsername + '_' + userId.slice(0, 6),
      display_name,
      role: 'owner',
    },
    { onConflict: 'id' },
  )

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
    return { error: cgError?.message ?? "Couldn't create campground." }
  }

  // 4) Link owner ↔ campground via campground_admins.
  const { error: adminError } = await admin.from('campground_admins').insert({
    campground_id: campground.id,
    user_id: userId,
    role: 'owner',
  })
  if (adminError) return { error: adminError.message }

  // 5) Issue a QR token row so /owner/qr immediately works.
  await admin.from('campground_qr_tokens').insert({ campground_id: campground.id })

  // Verification email may still be pending. We let the verify page handle it.
  redirect('/owner/dashboard')
}
