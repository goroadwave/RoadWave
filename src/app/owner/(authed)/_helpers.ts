import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OWNER_CAMPGROUND_COOKIE } from './_constants'

export type OwnerCampground = {
  id: string
  name: string
  slug: string
  city: string | null
  region: string | null
  address: string | null
  phone: string | null
  website: string | null
  logo_url: string | null
  amenities: string[]
  /** Optional owner-written notes per amenity, keyed by amenity label.
   *  Added in migration 0045. Pre-migration deployments default to {}. */
  amenity_notes: Record<string, string>
  timezone: string
  is_verified: boolean
  is_active: boolean
  // Billing + onboarding fields (added in migration 0031). Optional in
  // the type so any pre-migration deployment doesn't break — runtime
  // values default to nulls / false from the migration's column
  // defaults.
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled'
  plan: 'monthly' | 'annual' | null
  trial_started_at: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  stripe_customer_id: string | null
  onb_qr_printed: boolean
  onb_qr_posted: boolean
  onb_first_bulletin_sent: boolean
  google_review_url: string | null
  booking_url: string | null
  booking_message: string | null
  booking_promo_code: string | null
  // Facebook fields (mig 0057). Defaults: feature off, URL null, label
  // null. App falls back to "Recommend Us on Facebook" when label is
  // null. Button only renders when feature_facebook_enabled = true
  // AND facebook_review_url is non-null -- same defensive rule as the
  // existing Google Review + Book Again buttons.
  feature_facebook_enabled: boolean
  facebook_review_url: string | null
  facebook_button_label: string | null
  feature_review_enabled: boolean
  feature_book_again_enabled: boolean
  feature_contact_office_enabled: boolean
  feature_pulse_check_enabled: boolean
  email_notifications_enabled: boolean
  // Park Map fields. URL field (migration 0048) + upload fields
  // (migration 0051). The public guest hub renders the card only
  // when show_park_map = true AND at least one of
  // (park_map_path, park_map_url) is non-null. The uploaded file
  // takes precedence over the URL fallback when both are set.
  //
  // park_map_path is a misnomer — semantically it stores a full
  // public Supabase Storage URL (with ?v=<ts> cache buster), the
  // same convention as logo_url. Kept as "path" for consistency
  // with the applied 0051 schema.
  show_park_map: boolean
  park_map_url: string | null
  park_map_notes: string | null
  park_map_path: string | null
  park_map_file_type: string | null
  park_map_file_name: string | null
  park_map_updated_at: string | null
  // Guest-hub sections from migration 0049. Each section's card on
  // the public guest hub renders only when its show_* toggle is true
  // AND at least one content field is non-null.
  show_wifi: boolean
  wifi_network_name: string | null
  wifi_password: string | null
  wifi_notes: string | null
  show_rules: boolean
  rules_text: string | null
  show_emergency_info: boolean
  emergency_contact_number: string | null
  emergency_after_hours: string | null
  emergency_shelter_notes: string | null
  emergency_other_notes: string | null
  show_local_recommendations: boolean
  local_recommendations_text: string | null
  // Arrival & Departure (mig 0060). All-text fields the owner edits
  // on /owner/profile and the camper-facing ArrivalDepartureCard
  // renders near the top of the hub.
  check_in_time: string | null
  check_out_time: string | null
  early_check_in_note: string | null
  late_check_out_note: string | null
  arrival_departure_note: string | null
}

// A single membership row + the campground's name/slug, used by the
// switcher in the owner layout. Cheap query (one row per campground
// the owner manages, typically 1-3).
export type OwnerMembership = {
  campground_id: string
  slug: string
  name: string
  created_at: string
}

export async function loadOwnerMemberships(): Promise<OwnerMembership[]> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // Two separate queries instead of a PostgREST `!inner` join. The
  // join syntax was silently returning fewer rows than memberships in
  // production (suspected interaction with the user-scoped client +
  // FK row-level resolution), which collapsed multi-campground owners
  // to a single membership and made the switcher render its
  // single-owner static-label branch. Splitting the query keeps each
  // step trivial to reason about.
  const { data: links } = await supabase
    .from('campground_admins')
    .select('campground_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!links || links.length === 0) return []

  const ids = links.map((l) => l.campground_id)
  const { data: cgs } = await supabase
    .from('campgrounds')
    .select('id, slug, name')
    .in('id', ids)

  const byId = new Map<string, { id: string; slug: string; name: string }>(
    (cgs ?? []).map((c) => [c.id, c]),
  )

  const memberships = links
    .map((l) => {
      const cg = byId.get(l.campground_id)
      if (!cg) return null
      return {
        campground_id: l.campground_id,
        slug: cg.slug,
        name: cg.name,
        created_at: l.created_at,
      } as OwnerMembership
    })
    .filter((m): m is OwnerMembership => m !== null)

  // Diagnostic only -- helps confirm in Vercel runtime logs that the
  // user genuinely has N memberships when the switcher UI seems to
  // disagree. Cheap (one line per owner page render).
  console.log(
    `[owner-memberships] uid=${user.id} links=${links.length} resolved=${memberships.length}`,
  )

  return memberships
}

export async function loadOwnerCampground() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')

  // Pull ALL the owner's memberships so the layout can render a
  // switcher AND we can validate any cookie-stored selection. The
  // legacy bug was taking ORDER BY created_at DESC LIMIT 1 here,
  // which silently pinned multi-campground owners to their newest
  // link and hid all data on every other campground they own.
  const { data: links } = await supabase
    .from('campground_admins')
    .select('campground_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!links || links.length === 0) {
    return { user, campground: null as OwnerCampground | null }
  }

  // Resolve which campground to load. Priority:
  //   1. owner-selected cookie (validated against the user's
  //      memberships -- never trust a raw cookie value).
  //   2. most-recent membership (legacy default; preserves
  //      single-campground owner behaviour exactly).
  const cookieStore = await cookies()
  const cookieVal = cookieStore.get(OWNER_CAMPGROUND_COOKIE)?.value
  const validCookie =
    cookieVal && links.some((l) => l.campground_id === cookieVal)
      ? cookieVal
      : null
  const chosenId = validCookie ?? links[0]!.campground_id

  const { data: cg } = await supabase
    .from('campgrounds')
    .select(
      'id, name, slug, city, region, address, phone, website, logo_url, amenities, amenity_notes, timezone, is_verified, is_active, subscription_status, plan, trial_started_at, trial_ends_at, current_period_end, stripe_customer_id, onb_qr_printed, onb_qr_posted, onb_first_bulletin_sent, google_review_url, booking_url, booking_message, booking_promo_code, feature_facebook_enabled, facebook_review_url, facebook_button_label, feature_review_enabled, feature_book_again_enabled, feature_contact_office_enabled, feature_pulse_check_enabled, email_notifications_enabled, show_park_map, park_map_url, park_map_notes, park_map_path, park_map_file_type, park_map_file_name, park_map_updated_at, show_wifi, wifi_network_name, wifi_password, wifi_notes, show_rules, rules_text, show_emergency_info, emergency_contact_number, emergency_after_hours, emergency_shelter_notes, emergency_other_notes, show_local_recommendations, local_recommendations_text, check_in_time, check_out_time, early_check_in_note, late_check_out_note, arrival_departure_note',
    )
    .eq('id', chosenId)
    .single()

  return { user, campground: (cg ?? null) as OwnerCampground | null }
}
