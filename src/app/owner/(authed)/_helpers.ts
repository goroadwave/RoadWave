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
      'id, name, slug, city, region, address, phone, website, logo_url, amenities, timezone, is_verified, is_active',
    )
    .eq('id', link.campground_id)
    .single()

  return { user, campground: (cg ?? null) as OwnerCampground | null }
}
