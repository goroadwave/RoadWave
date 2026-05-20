import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
}

export async function loadOwnerCampground() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')

  // An owner can manage multiple campgrounds. Take the most-recent link
  // and ignore the rest for dashboard purposes. Using .limit(1) +
  // ordering avoids the .maybeSingle() trap (silent null on >1 row).
  const { data: links } = await supabase
    .from('campground_admins')
    .select('campground_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
  const link = links?.[0]
  if (!link) {
    return { user, campground: null as OwnerCampground | null }
  }

  const { data: cg } = await supabase
    .from('campgrounds')
    .select(
      'id, name, slug, city, region, address, phone, website, logo_url, amenities, amenity_notes, timezone, is_verified, is_active, subscription_status, plan, trial_started_at, trial_ends_at, current_period_end, stripe_customer_id, onb_qr_printed, onb_qr_posted, onb_first_bulletin_sent, google_review_url, booking_url, booking_message, booking_promo_code, feature_facebook_enabled, facebook_review_url, facebook_button_label, feature_review_enabled, feature_book_again_enabled, feature_contact_office_enabled, feature_pulse_check_enabled, email_notifications_enabled, show_park_map, park_map_url, park_map_notes, park_map_path, park_map_file_type, park_map_file_name, park_map_updated_at, show_wifi, wifi_network_name, wifi_password, wifi_notes, show_rules, rules_text, show_emergency_info, emergency_contact_number, emergency_after_hours, emergency_shelter_notes, emergency_other_notes, show_local_recommendations, local_recommendations_text',
    )
    .eq('id', link.campground_id)
    .single()

  return { user, campground: (cg ?? null) as OwnerCampground | null }
}
