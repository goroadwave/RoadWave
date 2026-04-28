import { redirect } from 'next/navigation'
import { OwnerPreview } from '@/components/owner/owner-preview'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Owner-only Guest View preview. Lives outside the (authed) layout group so
// it can render full-screen without the owner header chrome — the auth gate
// is inlined here. Guests have no role.owner so they bounce to /checkin if
// they ever land here, exactly like the (authed) layout does.
export default async function OwnerPreviewPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')
  if (!user.email_confirmed_at) redirect('/verify')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role === 'guest') redirect('/checkin')

  // Find the campground this owner is linked to.
  const { data: link } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!link) {
    return (
      <NoCampground />
    )
  }

  const cgId = link.campground_id
  const nowIso = new Date().toISOString()

  // Pull everything in parallel.
  const [
    { data: campground },
    { data: bulletin },
    { data: meetups },
    { data: adminRows },
  ] = await Promise.all([
    supabase
      .from('campgrounds')
      .select(
        'id, name, address, phone, website, logo_url, amenities, timezone',
      )
      .eq('id', cgId)
      .single(),
    supabase
      .from('bulletins')
      .select('id, message, category, expires_at, created_at')
      .eq('campground_id', cgId)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('meetups')
      .select('id, title, description, location, start_at, end_at, posted_by')
      .eq('campground_id', cgId)
      .order('start_at', { ascending: true }),
    supabase
      .from('campground_admins')
      .select('user_id')
      .eq('campground_id', cgId),
  ])

  if (!campground) {
    return <NoCampground />
  }

  const adminIds = new Set((adminRows ?? []).map((r) => r.user_id))
  // eslint-disable-next-line react-hooks/purity -- server component, request-scoped now
  const now = Date.now()
  const upcoming = (meetups ?? []).filter(
    (m) => new Date(m.start_at).getTime() >= now,
  )
  const hostedUpcoming = upcoming.filter((m) => adminIds.has(m.posted_by))
  const camperUpcoming = upcoming.filter((m) => !adminIds.has(m.posted_by))

  return (
    <OwnerPreview
      campground={{
        name: campground.name,
        logoUrl: campground.logo_url,
        amenities: campground.amenities ?? [],
        timezone: campground.timezone,
        address: campground.address,
        website: campground.website,
      }}
      bulletin={
        bulletin
          ? {
              message: bulletin.message,
              category: bulletin.category,
            }
          : null
      }
      hostedMeetups={hostedUpcoming.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        location: m.location,
        startAt: m.start_at,
      }))}
      camperMeetups={camperUpcoming.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        location: m.location,
        startAt: m.start_at,
      }))}
    />
  )
}

function NoCampground() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <p className="text-sm text-mist mb-3">
        No campground linked yet — finish setup first.
      </p>
      <a
        href="/owner/profile"
        className="text-sm font-semibold text-flame underline-offset-2 hover:underline"
      >
        Go to profile setup →
      </a>
    </div>
  )
}
