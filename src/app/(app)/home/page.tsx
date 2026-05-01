import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

import {
  ArrowRight,
  CalendarHeart,
  Eye,
  EyeOff,
  Ghost,
  HandHeart,
  MapPin,
  Users,
} from 'lucide-react'
import type { PrivacyMode } from '@/lib/types/db'

const PRIVACY_LABEL: Record<PrivacyMode, string> = {
  visible: 'Visible',
  quiet: 'Quiet',
  invisible: 'Invisible',
  campground_updates_only: 'Campground Updates Only',
}
import {
  enterCampgroundUpdatesOnlyAction,
  exitCampgroundUpdatesOnlyAction,
} from '@/app/(app)/settings/privacy/actions'
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
    .select(
      'username, display_name, privacy_mode, travel_style, is_admin, share_bulletins, share_meetups',
    )
    .eq('id', user!.id)
    .single()

  // Admins are exempt from the profile-setup wall — they typically
  // don't need a display_name to operate the founder dashboard.
  // They still land on /home normally; the Admin link in the header
  // is how they navigate to /admin.
  const isAdmin = profile?.is_admin === true
  // One-line diagnostic — visible in Vercel runtime logs. Confirms which
  // values the deployed code actually sees.
  console.log(
    `[home] uid=${user?.id} is_admin=${profile?.is_admin} display_name=${
      profile?.display_name === null ? 'NULL' : JSON.stringify(profile?.display_name)
    }`,
  )
  if (!isAdmin && !profile?.display_name) redirect('/profile/setup')

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
  // Self-mute: users with share_bulletins=false don't see this banner
  // (campground_updates_only mode toggles surface this preference, but the
  // toggle persists across all modes for predictable behavior).
  let activeBulletin: {
    id: string
    message: string
    category: string
  } | null = null
  const shareBulletins = profile?.share_bulletins !== false
  if (checkInCampground && shareBulletins) {
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

  const greetingName = profile.display_name ?? profile.username
  const firstName =
    (profile.display_name ?? '').split(/\s+/)[0] || profile.username

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
          Hey, {greetingName}.
        </h1>
        <div className="space-y-1 pt-1">
          <p className="font-serif italic text-flame text-xl sm:text-2xl leading-snug">
            Connect privately with campers who share your interests.
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
          <p className="font-semibold text-cream">{PRIVACY_LABEL[profile.privacy_mode as PrivacyMode] ?? profile.privacy_mode}</p>
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
            title="Campers checked in here"
            description="Who shares your interests?"
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

      <CuoQuickSwitch mode={profile.privacy_mode as PrivacyMode} />
    </div>
  )
}

// One-tap shortcut to Campground Updates Only mode. Lives below the
// "Where the action is" tile grid so a guest who just wants the
// campground updates can flip into CUO without hunting through the
// Privacy tab. When already in CUO, swap the button for a confirmation
// card with an undo link so the state is visible at a glance.
function CuoQuickSwitch({ mode }: { mode: PrivacyMode }) {
  if (mode === 'campground_updates_only') {
    return (
      <div
        role="status"
        className="rounded-2xl border border-flame/40 bg-flame/[0.08] p-4 space-y-2"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
          Campground Updates Only
        </p>
        <p className="text-sm text-cream leading-relaxed">
          You are now in Campground Updates Only mode — you can see
          campground updates and meetups but are invisible to other
          campers.
        </p>
        <form action={exitCampgroundUpdatesOnlyAction}>
          <button
            type="submit"
            className="text-xs font-semibold text-flame underline-offset-2 hover:underline"
          >
            Switch back to Visible →
          </button>
        </form>
      </div>
    )
  }
  return (
    <form action={enterCampgroundUpdatesOnlyAction}>
      <button
        type="submit"
        className="w-full text-left rounded-2xl border border-flame/30 bg-card p-4 hover:border-flame/60 hover:bg-flame/[0.04] transition-colors"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
          Just here for updates?
        </p>
        <p className="mt-1 text-sm font-semibold text-cream">
          Switch to Campground Updates Only
        </p>
        <p className="text-[11px] text-mist leading-snug">
          Only get direct communication from your campground host.
        </p>
      </button>
    </form>
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

function ModeIcon({ mode }: { mode: PrivacyMode }) {
  const Icon =
    mode === 'visible'
      ? Eye
      : mode === 'quiet'
        ? EyeOff
        : mode === 'campground_updates_only'
          ? MapPin
          : Ghost
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-flame/10 text-flame">
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  )
}
