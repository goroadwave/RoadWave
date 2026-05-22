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
  HandMetal,
  Info,
  MailOpen,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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

// "My RoadWave" -- the personal camper dashboard. IA refactor
// (Camper Connections v6, 2026-05-22) restructured this away from
// a long content page into a short, action-oriented card grid that
// fans out to every signed-in surface. Card targets:
//
//   * Camper Connections    -> /nearby (focused page)
//   * Waves (Incoming/Sent) -> /waves
//   * Past Waves / Road Mem.-> /crossed-paths
//   * Campground Info       -> /checkin (or directly /campground/<slug>)
//   * Meetups               -> /meetups
//   * Office Messages       -> /campground/<slug>#office-help (deep link
//                              into the active campground's QR page;
//                              the office-help section + lantern handle
//                              the actual thread surface)
//   * Privacy               -> /settings/privacy
//   * Updates Only          -> server-action toggle inline
//
// The page intentionally keeps the existing greeting, privacy-mode
// chip, check-in chip, and bulletin banner so a returning camper
// gets the same "where am I" surface at a glance. The "Where the
// action is" tile grid is replaced with a wider card grid covering
// every section the AppNav used to surface.

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

  const isAdmin = profile?.is_admin === true
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

  // Active check-in: drives the "Checked in at X" chip + the
  // Campground Info card's deep-link target.
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
    | { id: string; slug: string; name: string; logo_url: string | null }
    | null = null
  if (checkIn) {
    const { data } = await supabase
      .from('campgrounds')
      .select('id, slug, name, logo_url')
      .eq('id', checkIn.campground_id)
      .single()
    checkInCampground = data ?? null
  }

  // Active campground bulletin (same shape as before).
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

  // Unread-counts. The Lantern handles the visual ping in the
  // header, but the dashboard cards also surface lightweight
  // "you have N waiting" badges for the most common items.
  const [{ count: incomingWaveCount }, { count: matchedPathCount }] =
    await Promise.all([
      supabase
        .from('waves')
        .select('id', { head: true, count: 'exact' })
        .eq('to_profile_id', user!.id)
        .eq('status', 'pending'),
      supabase
        .from('crossed_paths')
        .select('id', { head: true, count: 'exact' })
        .eq('status', 'connected'),
    ])

  const greetingName = profile.display_name ?? profile.username
  const firstName =
    (profile.display_name ?? '').split(/\s+/)[0] || profile.username

  const campgroundHubHref = checkInCampground
    ? `/campground/${checkInCampground.slug}`
    : '/checkin'
  const officeMessagesHref = checkInCampground
    ? `/campground/${checkInCampground.slug}#office-help`
    : '/checkin'
  const camperConnectionsHref = checkInCampground ? '/nearby' : '/checkin'
  const meetupsHref = '/meetups'

  return (
    <div className="space-y-6">
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
        <p className="font-serif italic text-flame text-base sm:text-lg leading-snug">
          Your RoadWave dashboard.
        </p>
      </header>

      {/* Status chips: check-in + privacy mode at a glance. */}
      <div className="flex flex-wrap gap-2">
        {checkInCampground ? (
          <Link
            href={`/campground/${checkInCampground.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf/10 px-3 py-1 text-xs font-semibold text-leaf hover:bg-leaf/15 transition-colors"
          >
            <span aria-hidden>✓</span>
            Checked in at {checkInCampground.name}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-mist">
            Not at a campground right now
          </span>
        )}
        <Link
          href="/settings/privacy"
          className="inline-flex items-center gap-1.5 rounded-full border border-flame/30 bg-flame/10 px-3 py-1 text-xs font-semibold text-flame hover:bg-flame/15 transition-colors"
        >
          <PrivacyDot mode={profile.privacy_mode as PrivacyMode} />
          {PRIVACY_LABEL[profile.privacy_mode as PrivacyMode] ??
            profile.privacy_mode}
        </Link>
      </div>

      <DashboardGrid>
        <DashboardCard
          Icon={Users}
          title="Camper Connections"
          description={
            checkInCampground
              ? `See campers at ${checkInCampground.name}`
              : 'Sign in at a campground to see campers'
          }
          href={camperConnectionsHref}
          tone="primary"
        />
        <DashboardCard
          Icon={HandMetal}
          title="Waves"
          description={
            (incomingWaveCount ?? 0) > 0
              ? `${incomingWaveCount} incoming wave${
                  (incomingWaveCount ?? 0) === 1 ? '' : 's'
                } waiting`
              : 'Incoming and sent waves'
          }
          href="/waves"
          badge={(incomingWaveCount ?? 0) > 0 ? incomingWaveCount ?? null : null}
        />
        <DashboardCard
          Icon={HandHeart}
          title="Past Waves / Road Memory"
          description={
            (matchedPathCount ?? 0) > 0
              ? `${matchedPathCount} connection${
                  (matchedPathCount ?? 0) === 1 ? '' : 's'
                }`
              : 'People you’ve crossed paths with'
          }
          href="/crossed-paths"
        />
        <DashboardCard
          Icon={Info}
          title="Campground Info"
          description={
            checkInCampground
              ? `Wi-Fi, map, rules, amenities at ${checkInCampground.name}`
              : 'Scan a campground QR to open its info hub'
          }
          href={campgroundHubHref}
        />
        <DashboardCard
          Icon={MailOpen}
          title="Office Messages"
          description={
            checkInCampground
              ? 'Reach the campground office privately'
              : 'Office messages live on the campground page'
          }
          href={officeMessagesHref}
        />
        <DashboardCard
          Icon={CalendarHeart}
          title="Meetups"
          description="Coffee, fires, music posted by your campground"
          href={meetupsHref}
        />
        <DashboardCard
          Icon={ShieldCheck}
          title="Privacy"
          description={`Currently ${PRIVACY_LABEL[profile.privacy_mode as PrivacyMode] ?? profile.privacy_mode}`}
          href="/settings/privacy"
        />
        <CuoQuickCard
          mode={profile.privacy_mode as PrivacyMode}
          hasActiveCheckIn={!!checkInCampground}
        />
      </DashboardGrid>

      <p className="text-center text-xs text-mist/80">
        <Link
          href="/profile"
          className="text-flame underline-offset-2 hover:underline"
        >
          Profile & RoadWave Stops →
        </Link>
      </p>
    </div>
  )
}

function DashboardGrid({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="grid gap-3 grid-cols-1 sm:grid-cols-2"
      aria-label="Dashboard"
    >
      {children}
    </section>
  )
}

function DashboardCard({
  Icon,
  title,
  description,
  href,
  tone = 'default',
  badge = null,
}: {
  Icon: LucideIcon
  title: string
  description: string
  href: string
  tone?: 'default' | 'primary'
  badge?: number | null
}) {
  const className =
    tone === 'primary'
      ? 'group flex items-start gap-3 rounded-2xl border border-flame/40 bg-flame/[0.06] p-4 shadow-lg shadow-black/20 transition-all hover:border-flame/70 hover:bg-flame/[0.10]'
      : 'group flex items-start gap-3 rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20 transition-all hover:border-flame/40 hover:bg-card/80'
  const iconCls =
    tone === 'primary'
      ? 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-flame text-night'
      : 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-flame/10 text-flame group-hover:bg-flame group-hover:text-night transition-colors'
  return (
    <Link href={href} className={className} data-testid="dashboard-card">
      <span className={iconCls}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-cream">{title}</span>
        <span className="block text-xs text-mist leading-snug">
          {description}
        </span>
      </span>
      {badge !== null && (
        <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-flame text-night text-[10px] font-bold">
          {badge}
        </span>
      )}
      <ArrowRight
        className="mt-2 h-4 w-4 text-mist transition-all group-hover:text-flame group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}

// Updates Only sits on the dashboard as a tap-to-toggle card. When
// already in CUO mode, the card flips to a "switch back" confirmation
// so the camper can undo without hunting through Privacy.
function CuoQuickCard({
  mode,
  hasActiveCheckIn,
}: {
  mode: PrivacyMode
  hasActiveCheckIn: boolean
}) {
  if (mode === 'campground_updates_only') {
    return (
      <form
        action={exitCampgroundUpdatesOnlyAction}
        className="rounded-2xl border border-flame/40 bg-flame/[0.08] p-4 shadow-lg shadow-black/20"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-flame text-night">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-semibold text-cream">Updates Only</p>
            <p className="text-xs text-mist leading-snug">
              You only see campground updates. Camper Connections paused.
            </p>
            <button
              type="submit"
              className="mt-1 text-xs font-semibold text-flame underline-offset-2 hover:underline"
            >
              Switch back to Visible →
            </button>
          </div>
        </div>
      </form>
    )
  }
  return (
    <form
      action={enterCampgroundUpdatesOnlyAction}
      className="rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20 group hover:border-flame/40 hover:bg-card/80 transition-all"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-flame/10 text-flame group-hover:bg-flame group-hover:text-night transition-colors">
          <MapPin className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-semibold text-cream">Updates Only</p>
          <p className="text-xs text-mist leading-snug">
            {hasActiveCheckIn
              ? 'Get campground updates only — no camper-to-camper visibility'
              : 'Available once you’re checked in to a campground'}
          </p>
          <button
            type="submit"
            disabled={!hasActiveCheckIn}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-flame underline-offset-2 hover:underline disabled:text-mist disabled:no-underline disabled:cursor-not-allowed"
          >
            {hasActiveCheckIn ? 'Switch on' : 'Check in first'}
          </button>
        </div>
      </div>
    </form>
  )
}

function PrivacyDot({ mode }: { mode: PrivacyMode }) {
  const Icon =
    mode === 'visible'
      ? Eye
      : mode === 'quiet'
        ? EyeOff
        : mode === 'campground_updates_only'
          ? MapPin
          : Ghost
  return <Icon className="h-3 w-3" aria-hidden />
}
