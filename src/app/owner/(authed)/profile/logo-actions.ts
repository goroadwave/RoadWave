'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// File upload constraints — kept in sync with the client-side validation
// in OwnerLogoUpload. Both sides validate; the server is authoritative.
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
])
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export type LogoSaveState = { error: string | null; ok: boolean }
export type LogoUploadState = {
  ok: boolean
  error: string | null
  url: string | null
}

// Verify that the calling user is an authenticated admin of the named
// campground. Returns the user id on success, or an error message ready
// to surface in the UI. Used by both uploadCampgroundLogoAction and
// clearLogoAction so the ownership check is identical in both paths.
async function requireCampgroundOwnership(
  campgroundId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  // We deliberately use the admin client for the ownership lookup so we
  // don't depend on RLS on campground_admins matching the storage.objects
  // policy semantics. The user identity comes from the cookie session
  // above — admin client is only used to read the link table by user id.
  const admin = createSupabaseAdminClient()
  const { data: link } = await admin
    .from('campground_admins')
    .select('role')
    .eq('user_id', user.id)
    .eq('campground_id', campgroundId)
    .maybeSingle()
  if (!link) {
    return { ok: false, error: "You don't manage this campground." }
  }
  return { ok: true, userId: user.id }
}

function extForMime(mime: string, fallbackFileName: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/svg+xml') return 'svg'
  const m = fallbackFileName.match(/\.([a-z0-9]+)$/i)
  return (m?.[1] ?? 'png').toLowerCase()
}

// Server-side logo upload. Replaces the previous browser-direct-to-Storage
// pattern that depended on storage.objects RLS. The RLS policy in
// migration 0009 was correct in principle but failed in practice in
// production for the owner role context (symptom: "new row violates
// row-level security policy" even when the owner clearly had a matching
// campground_admins link). Routing through this action removes the
// dependency on storage-schema RLS for the happy path while keeping the
// existing storage.objects policies in place as defense-in-depth.
//
// Security model:
//   1. Authenticate the caller via the cookie session.
//   2. Verify the caller has a campground_admins link to campgroundId.
//   3. Validate MIME type + file size on the server (client also checks).
//   4. Upload via the service-role admin client, which bypasses storage
//      RLS — we've already done the ownership check ourselves.
//   5. The service-role key never leaves the server. The browser only
//      receives a public Storage URL.
//   6. The upload path is "<campgroundId>.<ext>" — same as the previous
//      direct-upload path. A future attacker who somehow forged the
//      campgroundId would fail step 2 and never reach step 4.
export async function uploadCampgroundLogoAction(
  campgroundId: string,
  formData: FormData,
): Promise<LogoUploadState> {
  // 1) File presence + validation
  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return { ok: false, error: 'No file uploaded.', url: null }
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      ok: false,
      error: 'PNG, JPG, WebP, or SVG only.',
      url: null,
    }
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: 'Logo must be 2 MB or smaller.',
      url: null,
    }
  }

  // 2) Auth + ownership gate
  const auth = await requireCampgroundOwnership(campgroundId)
  if (!auth.ok) return { ok: false, error: auth.error, url: null }

  // 3) Upload via service role
  const fileName = file instanceof File ? file.name : 'upload'
  const ext = extForMime(file.type, fileName)
  const path = `${campgroundId}.${ext}`

  const admin = createSupabaseAdminClient()
  const { error: uploadErr } = await admin.storage
    .from('campground-logos')
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,
    })
  if (uploadErr) {
    console.error(
      '[logo-upload] storage.upload failed:',
      uploadErr.message,
    )
    return {
      ok: false,
      error: `Upload failed: ${uploadErr.message}`,
      url: null,
    }
  }

  // 4) Public URL with cache buster so a re-upload of the same path
  //    visually refreshes immediately.
  const { data: pub } = admin.storage
    .from('campground-logos')
    .getPublicUrl(path)
  const url = `${pub.publicUrl}?v=${Date.now()}`

  // 5) Stamp on the campground row. Service-role write — we've already
  //    verified ownership in step 2 so RLS would be redundant here.
  const { error: saveErr } = await admin
    .from('campgrounds')
    .update({ logo_url: url })
    .eq('id', campgroundId)
  if (saveErr) {
    console.error(
      '[logo-upload] campgrounds.logo_url update failed:',
      saveErr.message,
    )
    return {
      ok: false,
      error: `Saved file but couldn't update campground: ${saveErr.message}`,
      url: null,
    }
  }

  revalidatePath('/owner/profile')
  revalidatePath('/owner/dashboard')
  revalidatePath(`/campground/${campgroundId}`)
  return { ok: true, error: null, url }
}

export async function clearLogoAction(
  campgroundId: string,
): Promise<LogoSaveState> {
  // Same ownership gate as upload — owners can clear, non-owners cannot.
  const auth = await requireCampgroundOwnership(campgroundId)
  if (!auth.ok) return { ok: false, error: auth.error }

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('campgrounds')
    .update({ logo_url: null })
    .eq('id', campgroundId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/owner/profile')
  revalidatePath('/owner/dashboard')
  revalidatePath(`/campground/${campgroundId}`)
  return { ok: true, error: null }
}
