import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  CalendarHeart,
  Eye,
  EyeOff,
  Ghost,
  HandHeart,
  Users,
} from 'lucide-react'
import { BulletinBanner } from '@/components/bulletins/bulletin-banner'
import { Eyebrow } from '@/components/ui/eyebrow'
import { WelcomeModal } from '@/components/onboarding/welcome-modal'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, privacy_mode, travel_style, is_admin')
    .eq('id', user!.id)
    .single()

  // Admins skip the profile-setup wall entirely and land in the
  // founder dashboard. They typically don't need a display_name to
  // operate the admin tooling.
  if (profile?.is_admin) redirect('/admin')

  if (!profile?.display_name) redirect('/profile/setup')

  const { count: interestsCount } = await supabase
    .from('profile_interests')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user!.id)

  const needsTravelStyle = !profile.travel_style
  const needsInterests = (interestsCount ?? 0) === 0
  const needsOnboarding = needsTravelStyle || needsInterests

  let interestCatalog: { slug: string; label: string }[] = []
  if (needsOnboarding) {
    const { data } = await supabase
      .from('interests')
      .select('slug, label')
      .order('label')
    interestCatalog = data ?? []
  }

  // Active check-in (24h sliding window). Used to surface a green
  // "Checked in at X" chip directly under the privacy card, matching
  // the demo Home screen.
  const { data: checkIn } = await supabase
    .from('check_ins')
    .select('campground_id, expires_at')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let checkInCampground:
    | { id: string; name: string; logo_url: string | null }
    | null = null
  if (checkIn) {
    const { data } = await supabase
      .from('campgrounds')
      .select('id, name, logo_url')
      .eq('id', checkIn.campground_id)
      .single()
    checkInCampground = data ?? null
  }

  // Active bulletin from the campground the guest is checked into.
  let activeBulletin: {
    id: string
    message: string
    category: string
  } | null = null
  if (checkInCampground) {
    const { data } = await supabase
      .from('bulletins')
      .select('id, message, category')
      .eq('campground_id', checkInCampground.id)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    activeBulletin = data ?? null
  }

  const firstName = profile.display_name.split(/\s+/)[0] ?? ''

  return (
    <div className="space-y-7">
      {needsOnboarding && (
        <WelcomeModal
          firstName={firstName}
          needsTravelStyle={needsTravelStyle}
          needsInterests={needsInterests}
          interests={interestCatalog}
        />
      )}

      {activeBulletin && checkInCampground && (
        <BulletinBanner
          campgroundName={checkInCampground.name}
          logoUrl={checkInCampground.logo_url}
          category={activeBulletin.category}
          message={activeBulletin.message}
        />
      )}

      <header className="space-y-2">
        <Eyebrow>@{profile.username}</Eyebrow>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-[1.05]">
          Hey, {profile.display_name}.
        </h1>
        <div className="space-y-1 pt-1">
          <p className="font-serif italic text-flame text-xl sm:text-2xl leading-snug">
            Meet the right neighbors without making it weird.
          </p>
          <p className="font-serif italic text-flame text-base sm:text-lg leading-snug">
            Open when you want. Invisible when you do not.
          </p>
        </div>
      </header>

      {checkInCampground && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf/10 px-3 py-1 text-xs font-semibold text-leaf">
          <span aria-hidden>✓</span>
          Checked in at {checkInCampground.name}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card px-4 py-3">
        <ModeIcon mode={profile.privacy_mode} />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-mist">Privacy mode</p>
          <p className="font-semibold text-cream capitalize">{profile.privacy_mode}</p>
        </div>
        <Link
          href="/settings/privacy"
          className="text-sm font-semibold text-flame underline-offset-2 hover:underline"
        >
          Change
        </Link>
      </div>

      <section className="space-y-3">
        <Eyebrow>Where the action is</Eyebrow>
        <div className="grid gap-3 sm:grid-cols-2">
          <Tile
            Icon={Users}
            title="Nearby campers"
            description="See who else is here right now."
            href="/nearby"
          />
          <Tile
            Icon={CalendarHeart}
            title="Meetup spots"
            description="Activities posted by your campground."
            href="/meetups"
          />
          <Tile
            Icon={HandHeart}
            title="Crossed paths"
            description="Mutual waves you've made."
            href="/crossed-paths"
          />
        </div>
      </section>
    </div>
  )
}

function Tile({
  Icon,
  title,
  description,
  href,
}: {
  Icon: typeof Users
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20 transition-all hover:border-flame/40 hover:bg-card/80"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-flame/10 text-flame group-hover:bg-flame group-hover:text-night transition-colors">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-cream">{title}</span>
        <span className="block text-sm text-mist">{description}</span>
      </span>
      <ArrowRight
        className="h-4 w-4 text-mist transition-all group-hover:text-flame group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}

function ModeIcon({ mode }: { mode: 'visible' | 'quiet' | 'invisible' }) {
  const Icon = mode === 'visible' ? Eye : mode === 'quiet' ? EyeOff : Ghost
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-flame/10 text-flame">
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  )
}
