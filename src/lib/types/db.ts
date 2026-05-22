export type PrivacyMode =
  | 'visible'
  | 'quiet'
  | 'invisible'
  | 'campground_updates_only'
export type CheckInStatus = 'active' | 'expired' | 'departed'
export type CampgroundRole = 'owner' | 'host'
export type TravelStyle =
  | 'full_timer'
  | 'weekender'
  | 'snowbird'
  | 'seasonal_guest'
  | 'camp_host'
  | 'work_camper'
  | 'solo_traveler'
  | 'traveling_for_work'
  | 'family_traveler'
  | 'prefer_quiet'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  rig_type: string | null
  miles_driven: number | null
  hometown: string | null
  status_tag: string | null
  personal_note: string | null
  years_rving: number | null
  has_pets: boolean
  pet_info: string | null
  travel_style: TravelStyle | null
  privacy_mode: PrivacyMode
  share_rig_type: boolean
  share_miles_driven: boolean
  share_hometown: boolean
  share_status: boolean
  share_note: boolean
  share_years: boolean
  share_pet: boolean
  share_travel_style: boolean
  share_interests: boolean
  // Self-mute toggles for the campground_updates_only mode (default true).
  share_bulletins: boolean
  share_meetups: boolean
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface Interest {
  id: number
  slug: string
  label: string
}

export interface Campground {
  id: string
  slug: string
  name: string
  city: string | null
  region: string | null
  lat: number | null
  lon: number | null
  created_at: string
}

export interface CheckIn {
  id: string
  profile_id: string
  campground_id: string
  checked_in_at: string
  expires_at: string
  status: CheckInStatus
}

export interface Wave {
  id: string
  from_profile_id: string
  to_profile_id: string
  campground_id: string | null
  sent_at: string
}

export interface CrossedPath {
  id: string
  profile_a_id: string
  profile_b_id: string
  campground_id: string | null
  matched_at: string
}

export interface Meetup {
  id: string
  campground_id: string
  posted_by: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string | null
  created_at: string
}

export interface LegalAck {
  id: string
  user_id: string
  terms_version: string
  privacy_version: string
  ip_address: string | null
  user_agent: string | null
  accepted_at: string
}

// Shape returned by the nearby_campers() RPC, enriched server-side
// by /campground/[slug]/page.tsx with display_name + username
// (looked up via the admin client because the profiles_select_*
// policies don't allow a regular SELECT pre-match). Camper Connections
// v3 (2026-05-21) surfaces a real identity on the discovery card --
// a camper has already opted into discovery by setting
// privacy_mode='visible'; the older blanket "A nearby camper"
// redaction left every card identityless and contradicted the
// product framing of "say hi to a real person at your campground".
//
// rig + interests stay individually gated by their share_* flags --
// those are richer profile data and remain opt-in-per-field.
export interface NearbyCamper {
  profile_id: string
  rig_type: string | null
  interests: string[] | null
  /** Camper's chosen display name. Always non-null for properly-
   *  provisioned accounts (the handle_new_user trigger requires it),
   *  but may be null for half-provisioned legacy rows. Falls back to
   *  username for rendering. */
  display_name: string | null
  /** Stable username slug. Used as the primary identity fallback and
   *  the @-handle line under the display name. */
  username: string | null
}
