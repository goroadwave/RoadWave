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
}

export async function loadOwnerCampground() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')

  const { data: link } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!link) {
    return { user, campground: null as OwnerCampground | null }
  }

  const { data: cg } = await supabase
    .from('campgrounds')
    .select(
      'id, name, slug, city, region, address, phone, website, logo_url, amenities, timezone, is_verified, is_active, subscription_status, plan, trial_started_at, trial_ends_at, current_period_end, stripe_customer_id, onb_qr_printed, onb_qr_posted, onb_first_bulletin_sent',
    )
    .eq('id', link.campground_id)
    .single()

  return { user, campground: (cg ?? null) as OwnerCampground | null }
}
