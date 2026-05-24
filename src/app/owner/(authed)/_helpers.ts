import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
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

// A single membership row + the campground's name/slug/active flag,
// used by the switcher in the owner layout and by the default-
// selection logic in loadOwnerCampground().
export type OwnerMembership = {
  campground_id: string
  slug: string
  name: string
  /** From campgrounds.is_active. False = trial expired, paused, or
   *  test campground. Not auto-selected as the default; surfaced in
   *  the dropdown with an "(inactive)" tag so the owner can still
   *  reach it on purpose. */
  is_active: boolean
  created_at: string
}

export async function loadOwnerMemberships(): Promise<OwnerMembership[]> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // BOTH queries route through the admin client. The user-scoped
  // version was returning 1 row in production for a user with 3
  // memberships (root cause turned out to be a dual-auth-user issue;
  // unrelated query-shape behavior also bit us). Admin client +
  // explicit eq('user_id', user.id) is the reliable path.
  //
  // Security: the user.id comes from the authenticated session
  // (supabase.auth.getUser above), so we cannot read other owners'
  // memberships. The campgrounds JOIN reads only the display + flag
  // fields needed for the switcher.
  const admin = createSupabaseAdminClient()

  const { data: links } = await admin
    .from('campground_admins')
    .select('campground_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!links || links.length === 0) return []

  const ids = links.map((l) => l.campground_id)
  const { data: cgs } = await admin
    .from('campgrounds')
    .select('id, slug, name, is_active')
    .in('id', ids)

  const byId = new Map<
    string,
    { id: string; slug: string; name: string; is_active: boolean }
  >((cgs ?? []).map((c) => [c.id, c]))

  return links
    .map((l) => {
      const cg = byId.get(l.campground_id)
      if (!cg) return null
      return {
        campground_id: l.campground_id,
        slug: cg.slug,
        name: cg.name,
        is_active: cg.is_active,
        created_at: l.created_at,
      } as OwnerMembership
    })
    .filter((m): m is OwnerMembership => m !== null)
}

export async function loadOwnerCampground() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')

  // Pull the full membership set (with is_active) so we can pick a
  // sensible default for owners who manage multiple campgrounds.
  const memberships = await loadOwnerMemberships()
  if (memberships.length === 0) {
    return { user, campground: null as OwnerCampground | null }
  }

  // Resolve which campground to load. Priority:
  //   1. owner-selected cookie (validated against the user's
  //      memberships -- never trust a raw cookie value).
  //   2. first ACTIVE campground (most recent active membership).
  //      Inactive / archived campgrounds remain in the dropdown but
  //      are not auto-selected.
  //   3. first inactive campground -- only if zero active ones exist
  //      (else the dashboard would render nothing on first visit).
  const cookieStore = await cookies()
  const cookieVal = cookieStore.get(OWNER_CAMPGROUND_COOKIE)?.value
  const validCookie =
    cookieVal && memberships.some((m) => m.campground_id === cookieVal)
      ? cookieVal
      : null
  const firstActive = memberships.find((m) => m.is_active)
  const chosenId =
    validCookie ??
    firstActive?.campground_id ??
    memberships[0]!.campground_id

  const { data: cg } = await supabase
    .from('campgrounds')
    .select(
      'id, name, slug, city, region, address, phone, website, logo_url, amenities, amenity_notes, timezone, is_verified, is_active, subscription_status, plan, trial_started_at, trial_ends_at, current_period_end, stripe_customer_id, onb_qr_printed, onb_qr_posted, onb_first_bulletin_sent, google_review_url, booking_url, booking_message, booking_promo_code, feature_facebook_enabled, facebook_review_url, facebook_button_label, feature_review_enabled, feature_book_again_enabled, feature_contact_office_enabled, feature_pulse_check_enabled, email_notifications_enabled, show_park_map, park_map_url, park_map_notes, park_map_path, park_map_file_type, park_map_file_name, park_map_updated_at, show_wifi, wifi_network_name, wifi_password, wifi_notes, show_rules, rules_text, show_emergency_info, emergency_contact_number, emergency_after_hours, emergency_shelter_notes, emergency_other_notes, show_local_recommendations, local_recommendations_text, check_in_time, check_out_time, early_check_in_note, late_check_out_note, arrival_departure_note',
    )
    .eq('id', chosenId)
    .single()

  return { user, campground: (cg ?? null) as OwnerCampground | null }
}
