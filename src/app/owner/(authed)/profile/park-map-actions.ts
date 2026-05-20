'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Owner-uploaded Park Map file. Server-action upload + remove,
// mirroring the hardened logo-actions.ts pattern. Direct
// browser-to-Storage was abandoned for the logo case because the
// storage.objects RLS policy was fragile for the owner role context
// in production; the same risk applies here, so we route through a
// server action that performs an explicit ownership check and then
// uses the service-role admin client to write to Storage.
//
// Storage bucket: campground-maps (public read; created in
// migration 0051). File-path convention: <campground_id>.<ext>.
// One file per campground; replacing with a new file at the same
// extension upserts, replacing with a different extension upserts
// the new path and best-effort removes the conflicting alternate-
// extension files so only one map ever exists per campground.
//
// Persists to four columns on public.campgrounds (migration 0051):
//   park_map_path        text       -- public URL with ?v=<ts>
//                                      (column name is a misnomer;
//                                       semantically this is a URL).
//   park_map_file_type   text       -- MIME type.
//   park_map_file_name   text       -- original filename.
//   park_map_updated_at  timestamptz -- stamped on upload; nulled
//                                      on clear.

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
])
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const BUCKET = 'campground-maps'

// All four possible extensions for a given campground's map file.
// Used by the replace-upload step to remove leftovers when the MIME
// changes (e.g. PNG -> PDF). Order matches the MIME allow-list above.
const ALL_EXTS = ['png', 'jpg', 'webp', 'pdf'] as const

export type ParkMapSaveState = { error: string | null; ok: boolean }
export type ParkMapUploadState = {
  ok: boolean
  error: string | null
  url: string | null
  mime: string | null
  fileName: string | null
}

// Re-implementing the ownership gate locally (vs importing from
// logo-actions.ts) so park-map-actions stays self-contained and the
// two files can evolve independently. The logic is identical to
// requireCampgroundOwnership in logo-actions.ts.
async function requireCampgroundOwnership(
  campgroundId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

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

function extForMime(mime: string): 'png' | 'jpg' | 'webp' | 'pdf' {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  return 'pdf'
}

// Fetch the campground slug -- used to revalidate the public
// guest-hub path after an upload/clear so the guest sees the new
// state immediately.
async function fetchCampgroundSlug(
  campgroundId: string,
): Promise<string | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('campgrounds')
    .select('slug')
    .eq('id', campgroundId)
    .maybeSingle<{ slug: string }>()
  return data?.slug ?? null
}

// Best-effort removal of all alternate-extension paths for this
// campground. Called from both upload (to clear leftovers when MIME
// changes) and clear (to delete whatever's there). Storage 404s are
// not surfaced -- the caller already considers them harmless.
async function removeAllExtensions(campgroundId: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  const paths = ALL_EXTS.map((ext) => `${campgroundId}.${ext}`)
  const { error } = await admin.storage.from(BUCKET).remove(paths)
  if (error) {
    // Storage delete of non-existent objects returns an error; that's
    // fine. We log so a real failure (auth/network) is still
    // visible.
    console.error('[park-map] storage.remove (best-effort) note:', error.message)
  }
}

export async function uploadParkMapAction(
  campgroundId: string,
  formData: FormData,
): Promise<ParkMapUploadState> {
  // 1) File presence + validation. We validate MIME first so we can
  //    return a tailored error before paying the auth round-trip.
  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return {
      ok: false,
      error: 'No file uploaded.',
      url: null,
      mime: null,
      fileName: null,
    }
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      ok: false,
      error: 'PNG, JPG, WebP, or PDF only.',
      url: null,
      mime: null,
      fileName: null,
    }
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: 'Map must be 10 MB or smaller.',
      url: null,
      mime: null,
      fileName: null,
    }
  }

  // 2) Auth + ownership gate.
  const auth = await requireCampgroundOwnership(campgroundId)
  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
      url: null,
      mime: null,
      fileName: null,
    }
  }

  // 3) Compute path and best-effort remove the OTHER three extensions
  //    first. If the owner is replacing a PNG with a PDF, we don't
  //    want the old PNG orphaned in storage; if the owner is
  //    replacing a PNG with a PNG, the upsert below overwrites it
  //    and the remove call is a no-op on the new path because it
  //    only existed before this call.
  const ext = extForMime(file.type)
  const path = `${campgroundId}.${ext}`
  const otherPaths = ALL_EXTS.filter((e) => e !== ext).map(
    (e) => `${campgroundId}.${e}`,
  )
  const admin = createSupabaseAdminClient()
  // Remove only the OTHER extensions, not the path we're about to
  // upload to (the upsert handles that one).
  {
    const { error: rmErr } = await admin.storage
      .from(BUCKET)
      .remove(otherPaths)
    if (rmErr) {
      console.error(
        '[park-map] best-effort remove of stale ext failed:',
        rmErr.message,
      )
    }
  }

  // 4) Upload via service role.
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,
    })
  if (uploadErr) {
    console.error('[park-map] storage.upload failed:', uploadErr.message)
    return {
      ok: false,
      error: `Upload failed: ${uploadErr.message}`,
      url: null,
      mime: null,
      fileName: null,
    }
  }

  // 5) Public URL with cache buster so a re-upload to the same path
  //    visually refreshes immediately on the guest hub.
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
  const url = `${pub.publicUrl}?v=${Date.now()}`

  // 6) Capture the original filename for owner-side display. Browser
  //    File objects expose .name; non-File Blobs (rare in form uploads)
  //    fall back to a generated name.
  const fileName =
    file instanceof File && file.name
      ? file.name.slice(0, 255)
      : `park-map.${ext}`

  // 7) Stamp on the campground row. Service-role write -- ownership
  //    was already verified in step 2.
  const { error: saveErr } = await admin
    .from('campgrounds')
    .update({
      park_map_path: url,
      park_map_file_type: file.type,
      park_map_file_name: fileName,
      park_map_updated_at: new Date().toISOString(),
    })
    .eq('id', campgroundId)
  if (saveErr) {
    console.error(
      '[park-map] campgrounds row update failed:',
      saveErr.message,
    )
    return {
      ok: false,
      error: `Saved file but couldn't update campground: ${saveErr.message}`,
      url: null,
      mime: null,
      fileName: null,
    }
  }

  const slug = await fetchCampgroundSlug(campgroundId)
  revalidatePath('/owner/profile')
  revalidatePath('/owner/dashboard')
  if (slug) revalidatePath(`/campground/${slug}`)

  return {
    ok: true,
    error: null,
    url,
    mime: file.type,
    fileName,
  }
}

export async function clearParkMapAction(
  campgroundId: string,
): Promise<ParkMapSaveState> {
  const auth = await requireCampgroundOwnership(campgroundId)
  if (!auth.ok) return { ok: false, error: auth.error }

  // Best-effort: remove every possible extension for this campground
  // from storage. We don't know which ext is current without reading
  // the row, but removing all four is idempotent and fast.
  await removeAllExtensions(campgroundId)

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('campgrounds')
    .update({
      park_map_path: null,
      park_map_file_type: null,
      park_map_file_name: null,
      park_map_updated_at: null,
    })
    .eq('id', campgroundId)
  if (error) return { ok: false, error: error.message }

  const slug = await fetchCampgroundSlug(campgroundId)
  revalidatePath('/owner/profile')
  revalidatePath('/owner/dashboard')
  if (slug) revalidatePath(`/campground/${slug}`)

  return { ok: true, error: null }
}
