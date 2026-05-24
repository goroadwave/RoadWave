import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ConversationMenu } from '@/components/crossed-paths/conversation-menu'
import { TappableCard } from '@/components/crossed-paths/tappable-card'
import { PageHeading } from '@/components/ui/page-heading'
import { SafetyBanner } from '@/components/ui/safety-banner'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { INTEREST_EMOJI, INTEREST_LABEL } from '@/lib/constants/interests'
import { TRAVEL_STYLE_LABEL } from '@/lib/constants/travel-styles'

type ProfileRow = {
  id: string
  username: string
  display_name: string | null
  rig_type: string | null
  miles_driven: number | null
  hometown: string | null
  status_tag: string | null
  personal_note: string | null
  years_rving: number | null
  has_pets: boolean
  pet_info: string | null
  travel_style: string | null
  share_rig_type: boolean
  share_miles_driven: boolean
  share_hometown: boolean
  share_status: boolean
  share_note: boolean
  share_years: boolean
  share_pet: boolean
  share_travel_style: boolean
  share_interests: boolean
}

export default async function CrossedPathsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: paths } = await supabase
    .from('crossed_paths')
    .select('id, profile_a_id, profile_b_id, campground_id, matched_at')
    .order('matched_at', { ascending: false })

  if (!paths || paths.length === 0) {
    return (
      <div className="space-y-5">
        <SafetyBanner message="Meet smart: Use public campground areas, let someone know where you are going, and report pressure, harassment, or suspicious behavior." />
        <PageHeading
          eyebrow="Mutual waves"
          title="Past Waves"
          subtitle="People who waved back will land here."
        />
        <Link
          href="/nearby"
          className="inline-flex items-center gap-2 rounded-lg bg-flame px-4 py-2 text-sm font-semibold text-night shadow-lg shadow-flame/10 hover:bg-amber-400"
        >
          See campers here
          <span aria-hidden>👋</span>
        </Link>
      </div>
    )
  }

  const otherIds = paths.map((p) =>
    p.profile_a_id === user!.id ? p.profile_b_id : p.profile_a_id,
  )

  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, rig_type, miles_driven, hometown, status_tag, personal_note, years_rving, has_pets, pet_info, travel_style, share_rig_type, share_miles_driven, share_hometown, share_status, share_note, share_years, share_pet, share_travel_style, share_interests',
    )
    .in('id', otherIds)

  const profileById = new Map<string, ProfileRow>(
    (profiles ?? []).map((p) => [p.id, p as ProfileRow]),
  )

  const { data: piRows } = await supabase
    .from('profile_interests')
    .select('profile_id, interest_id')
    .in('profile_id', otherIds)

  const { data: interestRows } = await supabase.from('interests').select('id, slug')
  const slugById = new Map<number, string>(
    (interestRows ?? []).map((i) => [i.id, i.slug]),
  )
  const interestsByProfile = new Map<string, string[]>()
  for (const row of piRows ?? []) {
    const slug = slugById.get(row.interest_id)
    if (!slug) continue
    const arr = interestsByProfile.get(row.profile_id) ?? []
    arr.push(slug)
    interestsByProfile.set(row.profile_id, arr)
  }

  const cgIds = paths
    .map((p) => p.campground_id)
    .filter((id): id is string => Boolean(id))
  const { data: cgRows } =
    cgIds.length > 0
      ? await supabase.from('campgrounds').select('id, name').in('id', cgIds)
      : { data: [] as { id: string; name: string }[] }
  const cgNameById = new Map<string, string>(
    (cgRows ?? []).map((c) => [c.id, c.name]),
  )

  return (
    <div className="space-y-5">
      <SafetyBanner message="Meet smart: Use public campground areas, let someone know where you are going, and report pressure, harassment, or suspicious behavior." />
      <PageHeading
        eyebrow="Mutual waves"
        title="Past Waves"
        subtitle="People who waved back."
      />

      <ul className="space-y-3">
        {paths.map((p) => {
          const otherId = p.profile_a_id === user!.id ? p.profile_b_id : p.profile_a_id
          const profile = profileById.get(otherId)
          if (!profile) {
            // Diagnostic: profile-row lookup missed for this camper.
            // Card hides because we can't render a name/identity, but
            // log the gap so we can pinpoint why the conversation
            // entry point disappeared.
            console.log(
              `[past-waves] hiding card -- profile missing currentUserId=${user!.id} otherUserId=${otherId} crossedPathId=${p.id}`,
            )
            return null
          }
          const slugs = interestsByProfile.get(otherId) ?? []
          const cgName = p.campground_id
            ? cgNameById.get(p.campground_id) ?? 'Unknown campground'
            : 'Unknown campground'
          const when = formatDistanceToNow(new Date(p.matched_at), { addSuffix: true })
          const otherName = profile.display_name ?? profile.username
          // Per the 2026-05-24 spec, the conversation entry point
          // must NOT be gated on the viewer being checked in at the
          // original campground. crossed_paths is a durable account
          // -level connection; the /crossed-paths/[id] page handles
          // status='connected' / 'pending_consent' / 'declined'
          // server-side and renders the right surface in each case.
          // canMessage here just answers "do we have enough data to
          // build the link?" -- always true if profile + path id
          // both exist.
          const canMessage = Boolean(p.id && profile.id)
          console.log(
            `[past-waves] render card currentUserId=${user!.id} otherUserId=${otherId} crossedPathId=${p.id} canMessage=${canMessage}`,
          )
          return (
            <li key={p.id} className="relative">
              <TappableCard
                href={`/crossed-paths/${p.id}`}
                ariaLabel={`Open conversation with ${otherName}`}
                className="rounded-2xl hover:ring-2 hover:ring-flame/30 transition-shadow active:opacity-90"
              >
                <CrossedPathCard
                  profile={profile}
                  interests={slugs}
                  campgroundName={cgName}
                  when={when}
                  crossedPathId={p.id}
                  otherName={otherName}
                />
              </TappableCard>
              {/* Mounted ABOVE the TappableCard via absolute
                  positioning so the menu's tap target doesn't
                  bubble into the card-link click handler. The
                  ConversationMenu's button + dropdown both
                  call stopPropagation defensively as well. */}
              <div className="absolute top-3 right-3">
                <ConversationMenu
                  crossedPathId={p.id}
                  otherUserId={otherId}
                  otherName={otherName}
                  campgroundId={p.campground_id}
                  variant="card"
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-cream">
      {children}
    </span>
  )
}

function CrossedPathCard({
  profile,
  interests,
  campgroundName,
  when,
  crossedPathId,
  otherName,
}: {
  profile: ProfileRow
  interests: string[]
  campgroundName: string
  when: string
  crossedPathId: string
  otherName: string
}) {
  const name = profile.display_name ?? profile.username
  const pills: { label: string; value: string }[] = []
  if (profile.share_rig_type && profile.rig_type)
    pills.push({ label: 'Rig', value: profile.rig_type })
  if (profile.share_hometown && profile.hometown)
    pills.push({ label: 'From', value: profile.hometown })
  if (profile.share_miles_driven && profile.miles_driven != null)
    pills.push({ label: 'Miles', value: profile.miles_driven.toLocaleString() })
  if (profile.share_years && profile.years_rving != null)
    pills.push({ label: 'Years RVing', value: profile.years_rving.toString() })
  if (profile.share_pet && profile.has_pets && profile.pet_info)
    pills.push({ label: 'Pets', value: profile.pet_info })

  const styleLabel =
    profile.share_travel_style && profile.travel_style
      ? TRAVEL_STYLE_LABEL[profile.travel_style] ?? profile.travel_style
      : null

  return (
    <article className="rounded-2xl border border-flame/30 bg-card p-4 shadow-lg shadow-black/20">
      {/* pr-12 reserves space for the ConversationMenu's absolute-
          positioned ⋯ button at top-3 right-3 of the <li>, so the
          "Mutual Wave" chip doesn't collide with it on narrow
          viewports. */}
      <div className="flex items-start justify-between gap-3 pr-12">
        <div>
          <h3 className="font-semibold text-cream leading-tight">{name}</h3>
          <p className="text-xs text-mist">@{profile.username}</p>
          {styleLabel && (
            <span className="mt-2 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2.5 py-0.5 text-xs font-semibold text-flame">
              {styleLabel}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-xs font-semibold text-flame">
          <span aria-hidden>👋</span> Mutual Wave
        </span>
      </div>
      <p className="mt-1 text-xs text-mist">
        At {campgroundName} · {when}
      </p>

      {profile.share_status && profile.status_tag && (
        <p className="mt-3 font-serif italic text-flame text-base sm:text-lg">
          &ldquo;{profile.status_tag}&rdquo;
        </p>
      )}
      {profile.share_note && profile.personal_note && (
        <p className="mt-2 text-sm text-cream/90">{profile.personal_note}</p>
      )}

      {pills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pills.map((p) => (
            <StatusPill key={p.label}>
              <span className="text-mist mr-1">{p.label}</span>
              <span className="text-cream">{p.value}</span>
            </StatusPill>
          ))}
        </div>
      )}

      {profile.share_interests && interests.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {interests.map((slug) => (
            <li
              key={slug}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-cream"
            >
              <span aria-hidden>{INTEREST_EMOJI[slug] ?? ''}</span>
              {INTEREST_LABEL[slug] ?? slug}
            </li>
          ))}
        </ul>
      )}

      {/* Visible message CTA. The TappableCard wrapping this article
          already makes the entire card a link to /crossed-paths/<id>,
          but the wrapper is invisible -- campers didn't know they
          could tap. This button makes the action explicit at the
          bottom of every card. Same destination; the parent
          TappableCard intercepts the tap so this is a visual
          affordance, not a competing handler. */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <span
          aria-hidden
          data-testid="past-waves-open-conversation"
          data-crossed-path-id={crossedPathId}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15"
        >
          Message {otherName}
          <span aria-hidden>→</span>
        </span>
      </div>
    </article>
  )
}
