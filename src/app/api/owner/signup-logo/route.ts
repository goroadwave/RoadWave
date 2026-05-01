import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

// Pre-signup logo upload. The visitor doesn't have an auth user yet,
// so the upload runs through a service-role admin client into the
// demo-logos bucket (public read, service-role-only writes — same
// pattern used by the marketing /api/demo flow).
//
// The returned public URL is captured into a hidden field on the
// owner-signup form and persisted on the owner_signup_submissions
// row, then carried into campgrounds.logo_url at provisioning time.
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: 'Use PNG, JPG, WebP, or GIF.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Logo must be under 2 MB.' },
      { status: 400 },
    )
  }

  const ext =
    file.type === 'image/jpeg'
      ? 'jpg'
      : file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'gif'
  // Random path so different submissions don't collide. Prefix with
  // owner-signup/ so these are easy to spot in the bucket.
  const path = `owner-signup/${crypto.randomUUID()}.${ext}`

  const admin = createSupabaseAdminClient()
  const { error } = await admin.storage
    .from('demo-logos')
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
    })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = admin.storage.from('demo-logos').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
