import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Shared resolver for /login and /signup. Both pages render an
// intent-aware header (Camper Connections vs RoadWave Profile vs
// generic) and need the SAME logic for:
//
//   1. Picking the intent variant -- explicit ?intent=connections /
//      ?intent=profile takes precedence, otherwise we infer "connections"
//      when next=/checkin?token=<uuid> is present (legacy QR link
//      shape), otherwise we default to "generic" (the no-context plain
//      sign-in / sign-up page used outside the QR flow).
//
//   2. Resolving the campground tied to the request. Two sources are
//      supported, in priority order:
//        a. ?slug=<slug>      -- the profile-intent path that the QR
//                               header "Sign in" link uses. Slug points
//                               directly at public.campgrounds.
//        b. ?next=/checkin?token=<uuid>
//                            -- the connections-intent path used by
//                               the "Join Camper Connections" button
//                               and by older QR links that haven't
//                               adopted the explicit ?slug param yet.
//                               Token resolves through campground_qr_tokens.
//
// Both sources resolve to the same {name, slug, city, region} shape so
// the auth page can render uniform "at {Campground Name}" copy.
//
// All DB reads use the admin client because:
//   - campground_qr_tokens is RLS-locked to service-role (mig 0002).
//   - The auth pages are anon-only (authed users are redirected away
//     before render), so an admin lookup here can't leak between users.

const CHECKIN_NEXT_RE = /^\/checkin\?token=([0-9a-f-]{36})$/i
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Slug allow-list matches the QR landing route ([a-z0-9-]{1,80}).
// Looser than the actual constraint in public.campgrounds.slug, but
// strict enough to keep arbitrary text from hitting the DB.
const SLUG_RE = /^[a-z0-9-]{1,80}$/

export type QrAuthIntent = 'connections' | 'profile' | 'generic'

export type QrAuthCampground = {
  name: string
  slug: string
  city: string | null
  region: string | null
}

export type QrAuthContext = {
  intent: QrAuthIntent
  campground: QrAuthCampground | null
}

type ResolverInput = {
  /** Raw `intent` searchParam value (untrusted). */
  intent?: string | string[]
  /** Raw `slug` searchParam value (untrusted). */
  slug?: string | string[]
  /** Raw `next` searchParam value (untrusted). */
  next?: string | string[]
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

function normalizeIntent(raw: string | undefined): QrAuthIntent | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower === 'connections' || lower === 'profile') return lower
  return null
}

function normalizeSlug(raw: string | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim().toLowerCase()
  return SLUG_RE.test(trimmed) ? trimmed : null
}

function tokenFromNext(raw: string | undefined): string | null {
  if (!raw) return null
  const decoded = raw.startsWith('%2F') ? decodeURIComponent(raw) : raw
  const match = decoded.match(CHECKIN_NEXT_RE)
  if (!match) return null
  const token = match[1]
  return UUID_RE.test(token) ? token : null
}

async function resolveBySlug(
  slug: string,
): Promise<QrAuthCampground | null> {
  try {
    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from('campgrounds')
      .select('name, slug, city, region, is_active')
      .eq('slug', slug)
      .maybeSingle<{
        name: string
        slug: string
        city: string | null
        region: string | null
        is_active: boolean
      }>()
    if (!data || !data.is_active) return null
    return {
      name: data.name,
      slug: data.slug,
      city: data.city,
      region: data.region,
    }
  } catch {
    return null
  }
}

async function resolveByToken(
  token: string,
): Promise<QrAuthCampground | null> {
  try {
    const admin = createSupabaseAdminClient()
    const { data: tokenRow } = await admin
      .from('campground_qr_tokens')
      .select('campground_id')
      .eq('token', token)
      .maybeSingle<{ campground_id: string }>()
    if (!tokenRow?.campground_id) return null
    const { data: cg } = await admin
      .from('campgrounds')
      .select('name, slug, city, region, is_active')
      .eq('id', tokenRow.campground_id)
      .maybeSingle<{
        name: string
        slug: string
        city: string | null
        region: string | null
        is_active: boolean
      }>()
    if (!cg || !cg.is_active) return null
    return {
      name: cg.name,
      slug: cg.slug,
      city: cg.city,
      region: cg.region,
    }
  } catch {
    return null
  }
}

export async function resolveQrAuthContext(
  input: ResolverInput,
): Promise<QrAuthContext> {
  const explicitIntent = normalizeIntent(pickString(input.intent))
  const slug = normalizeSlug(pickString(input.slug))
  const token = tokenFromNext(pickString(input.next))

  // Slug takes precedence over token: campers arriving via the new
  // ?slug=<slug> param know exactly which campground they're at, and a
  // mismatched next= shouldn't override.
  const campground = slug
    ? await resolveBySlug(slug)
    : token
      ? await resolveByToken(token)
      : null

  let intent: QrAuthIntent
  if (explicitIntent) {
    intent = explicitIntent
  } else if (token) {
    // Legacy "Join Camper Connections" link shape with no explicit
    // intent param -- the presence of a checkin token in next= is a
    // strong "connections" signal.
    intent = 'connections'
  } else {
    intent = 'generic'
  }

  return { intent, campground }
}
