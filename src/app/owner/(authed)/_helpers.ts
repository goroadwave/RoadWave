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
  feature_review_enabled: boolean
  feature_book_again_enabled: boolean
  feature_contact_office_enabled: boolean
  feature_pulse_check_enabled: boolean
  email_notifications_enabled: boolean
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
      'id, name, slug, city, region, address, phone, website, logo_url, amenities, timezone, is_verified, is_active, subscription_status, plan, trial_started_at, trial_ends_at, current_period_end, stripe_customer_id, onb_qr_printed, onb_qr_posted, onb_first_bulletin_sent, google_review_url, booking_url, booking_message, booking_promo_code, feature_review_enabled, feature_book_again_enabled, feature_contact_office_enabled, feature_pulse_check_enabled, email_notifications_enabled',
    )
    .eq('id', link.campground_id)
    .single()

  return { user, campground: (cg ?? null) as OwnerCampground | null }
}
