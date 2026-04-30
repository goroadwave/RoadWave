import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRequestIp } from '@/lib/utils'

// POST /api/demo
// Multipart form: campground_name (required), logo (optional File),
//                 website, city, region, email (all optional strings).
// Creates a row in public.demo_pages, optionally uploading the logo to
// the demo-logos bucket. Returns { slug } so the client can link to
// /demo/<slug>.
//
// Anonymous flow — no auth. RLS allows public SELECT (when expires_at >
// now()) but no INSERT/UPDATE for end users; the service-role client
// here is the only path that creates rows.

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
])
const URL_RE = /^https?:\/\/[^\s]{3,300}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return new NextResponse('Invalid form body.', { status: 400 })
  }

  const campgroundName = stringOrEmpty(form.get('campground_name')).trim()
  const websiteRaw = stringOrEmpty(form.get('website')).trim()
  const city = stringOrEmpty(form.get('city')).trim()
  const region = stringOrEmpty(form.get('region')).trim()
  const email = stringOrEmpty(form.get('email')).trim()
  const logo = form.get('logo')

  // The form invites scheme-less input (e.g. "www.yourcampground.com"),
  // so prepend https:// before validating + storing. Keeps the row
  // normalized while letting users type the URL the way they read it.
  const website = websiteRaw
    ? /^https?:\/\//i.test(websiteRaw)
      ? websiteRaw
      : `https://${websiteRaw}`
    : ''

  if (!campgroundName) {
    return new NextResponse('Campground name is required.', { status: 400 })
  }
  if (campgroundName.length > 120) {
    return new NextResponse('Campground name is too long.', { status: 400 })
  }
  if (website && !URL_RE.test(website)) {
    return new NextResponse(
      'Enter a valid website (e.g. www.yourcampground.com).',
      { status: 400 },
    )
  }
  if (email && !EMAIL_RE.test(email)) {
    return new NextResponse('Enter a valid email.', { status: 400 })
  }
  if (city.length > 80 || region.length > 80) {
    return new NextResponse('City / region too long.', { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 1) Generate a unique slug. Up to 5 attempts in case of collision.
  let slug = ''
  for (let i = 0; i < 5; i++) {
    const candidate = `${slugify(campgroundName)}-${randomSuffix()}`
    const { data: existing } = await admin
      .from('demo_pages')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!existing) {
      slug = candidate
      break
    }
  }
  if (!slug) {
    return new NextResponse("Couldn't generate a unique slug.", { status: 500 })
  }

  // 2) Optional logo upload to demo-logos bucket.
  let logoUrl: string | null = null
  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_LOGO_TYPES.has(logo.type)) {
      return new NextResponse('Logo must be PNG, JPG, WebP, or SVG.', {
        status: 400,
      })
    }
    if (logo.size > MAX_LOGO_BYTES) {
      return new NextResponse('Logo must be under 2 MB.', { status: 400 })
    }
    const ext = extensionFor(logo.type)
    const path = `${slug}.${ext}`
    const { error: uploadError } = await admin.storage
      .from('demo-logos')
      .upload(path, logo, {
        contentType: logo.type,
        cacheControl: '3600',
        upsert: false,
      })
    if (uploadError) {
      console.error('[api/demo] logo upload failed:', uploadError.message)
      // Soft-fail the logo — keep going so the demo still gets a slug.
    } else {
      const { data } = admin.storage.from('demo-logos').getPublicUrl(path)
      logoUrl = data.publicUrl
    }
  }

  // 3) Persist the demo row.
  const { error: insertError } = await admin.from('demo_pages').insert({
    slug,
    campground_name: campgroundName,
    logo_url: logoUrl,
    website: website || null,
    city: city || null,
    region: region || null,
    email: email || null,
    ip_address: getRequestIp(request.headers),
    user_agent: request.headers.get('user-agent'),
  })
  if (insertError) {
    console.error('[api/demo] insert failed:', insertError.message)
    return new NextResponse(insertError.message, { status: 500 })
  }

  return NextResponse.json({ slug })
}

function stringOrEmpty(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v : ''
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'campground'
  )
}

function randomSuffix(): string {
  // 6 lowercase alphanumeric chars. ~36^6 ≈ 2 billion possibilities, plenty
  // for collision-free generation across our scale.
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += chars[b % chars.length]
  return out
}

function extensionFor(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'bin'
  }
}
