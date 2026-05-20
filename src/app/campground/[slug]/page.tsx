import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { TrackedLinkButton } from '@/components/campgrounds/tracked-link-button'
import { WelcomeEngagement } from '@/components/campgrounds/welcome-engagement'
import { Logo } from '@/components/ui/logo'
import { splitAmenities } from '@/lib/campgrounds/amenities'
import { isQuickCheckInSlug } from '@/lib/checkin/quick-checkin-slugs'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Public unified guest hub. Reached when a camper scans a campground
// QR — the QR encodes /campground/<slug>?token=<uuid>. No login is
// required for anything on this page.
//
// Phase D of the guest-hub pivot (2026-05-20) merged this page with
// /campground/<slug>/updates so guests get the practical hub content
// (Park Map, Wi-Fi, Emergency Info, Rules, Local Recs, announcements,
// meetups, amenities, helpful links, engagement hub) directly on the
// QR landing URL. The old /updates path now 301-redirects here, so
// printed QRs and old links keep working.
//
// Auth-state branching:
//   * Authed visitor WITH a valid token → redirect immediately to
//     /checkin?token=… so they land on the check-in confirmation
//     flow without seeing the hub they don't need.
//   * Anonymous visitor → render the unified hub. The "Meet Other
//     Campers — Optional" card near the bottom is the only surface
//     that triggers signup/login.
//
// The pending_checkin_token cookie is set by middleware when the URL
// matches /campground/<slug>?token=<uuid>; the (app) layout reads it
// post-auth and redirects to /checkin?token=… so a camper arrives at
// the right destination without needing to re-scan or re-paste the
// link.
//
// Service-role lookups for campground_qr_tokens (RLS service-only),
// for bulletin/meetup reads (RLS limits public reads otherwise), and
// for the event-log inserts (campground_events is service-role-only).

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Params = { slug: string }

type CampgroundRow = {
  id: string
  slug: string
  name: string
  city: string | null
  region: string | null
  logo_url: string | null
  is_active: boolean
  // Amenities + helpful-links + engagement-hub fields. All optional
  // from the camper's POV; each surface is gated on having both an
  // owner-set feature flag (where applicable) and the data it needs.
  amenities: string[] | null
  /** Optional owner-written note per amenity, keyed by amenity label.
   *  Added in migration 0045; missing on pre-migration deployments
   *  (the renderer treats null/undefined as an empty map). */
  amenity_notes: Record<string, string> | null
  website: string | null
  phone: string | null
  google_review_url: string | null
  booking_url: string | null
  booking_message: string | null
  booking_promo_code: string | null
  feature_review_enabled: boolean
  feature_book_again_enabled: boolean
  feature_contact_office_enabled: boolean
  feature_pulse_check_enabled: boolean
  // Park Map. URL fallback (mig 0048) + uploaded file (mig 0051).
  // The card renders only when show_park_map is true AND at least
  // one of (park_map_path, park_map_url) is non-null. The uploaded
  // file takes precedence over the URL fallback.
  // park_map_path stores the full Supabase Storage public URL
  // (column name is a misnomer; see _helpers.ts comment).
  show_park_map: boolean
  park_map_url: string | null
  park_map_notes: string | null
  park_map_path: string | null
  park_map_file_type: string | null
  // Guest-hub sections from migration 0049. Each card renders only
  // when its show_* toggle is true AND at least one content field is
  // non-null. Half-configured states render nothing.
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

type BulletinRow = {
  id: string
  message: string
  category: 'event' | 'special' | 'alert' | 'general'
  expires_at: string | null
  created_at: string
}

type MeetupRow = {
  id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string | null
}

type TokenRow = {
  token: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('campgrounds')
    .select('name, city, region')
    .eq('slug', slug)
    .maybeSingle<{ name: string; city: string | null; region: string | null }>()
  if (!data) {
    return {
      title: 'Campground not on RoadWave yet',
      robots: { index: false, follow: false },
    }
  }
  const where = [data.city, data.region].filter(Boolean).join(', ')
  return {
    title: `${data.name} on RoadWave`,
    description: `${data.name}${where ? ` · ${where}` : ''} — park info, updates, help, and optional camper connection.`,
  }
}

export default async function CampgroundGuestHubPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const { token: scannedTokenRaw } = await searchParams
  const scannedToken =
    typeof scannedTokenRaw === 'string' && UUID_RE.test(scannedTokenRaw)
      ? scannedTokenRaw
      : null

  const admin = createSupabaseAdminClient()

  const { data: campground } = await admin
    .from('campgrounds')
    .select(
      'id, slug, name, city, region, logo_url, is_active, amenities, amenity_notes, website, phone, google_review_url, booking_url, booking_message, booking_promo_code, feature_review_enabled, feature_book_again_enabled, feature_contact_office_enabled, feature_pulse_check_enabled, show_park_map, park_map_url, park_map_notes, park_map_path, park_map_file_type, show_wifi, wifi_network_name, wifi_password, wifi_notes, show_rules, rules_text, show_emergency_info, emergency_contact_number, emergency_after_hours, emergency_shelter_notes, emergency_other_notes, show_local_recommendations, local_recommendations_text',
    )
    .eq('slug', slug)
    .maybeSingle<CampgroundRow>()

  if (!campground || !campground.is_active) notFound()

  // Token resolution. Prefer the ?token= query param (proves the
  // visitor came through a real QR scan) over the campground's stored
  // canonical token. The downstream "Meet Other Campers" CTA uses
  // the resolved token to build a /signup-next or /quickcheckin URL
  // that wires the camper to the right destination.
  let resolvedToken: string | null = scannedToken
  if (!resolvedToken) {
    const { data: tokenRow } = await admin
      .from('campground_qr_tokens')
      .select('token')
      .eq('campground_id', campground.id)
      .maybeSingle<TokenRow>()
    resolvedToken = tokenRow?.token ?? null
  }

  // Authed visitor with a real token: skip the hub and go straight
  // to the camper check-in flow. The (app) layout will run its own
  // auth + consent gates from there.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user && scannedToken) {
    redirect(`/checkin?token=${scannedToken}`)
  }

  // Event logging — fire-and-forget so renders never block on stats
  // writes. Three event types fire on different conditions:
  //   * qr_scan: only when ?token= is in the URL, i.e. the visitor
  //     came in via a printed QR sticker (not a direct link or a
  //     bookmark).
  //   * bulletin_view: legacy bulletin-engagement counter, kept for
  //     the existing owner dashboard metric.
  //   * updates_only_view: per-visit guest-hub counter introduced in
  //     migration 0044.
  // We insert all events in one round-trip when applicable so the
  // page render doesn't pay multiple network costs.
  const events: { campground_id: string; event_type: string; metadata: Record<string, unknown> }[] = [
    {
      campground_id: campground.id,
      event_type: 'bulletin_view',
      metadata: { source: 'guest_hub' },
    },
    {
      campground_id: campground.id,
      event_type: 'updates_only_view',
      metadata: { source: 'guest_hub' },
    },
  ]
  if (scannedToken) {
    events.push({
      campground_id: campground.id,
      event_type: 'qr_scan',
      metadata: { source: 'guest_hub' },
    })
  }
  void admin
    .from('campground_events')
    .insert(events)
    .then(({ error }) => {
      if (error) {
        console.error('[campground/guest-hub] event log failed:', error.message)
      }
    })

  // Bulletins (active = no expiry or future expiry) and upcoming
  // meetups (start_at >= now). Both capped at 30 so a campground
  // with a long history doesn't bloat the page.
  const nowIso = new Date().toISOString()
  const [{ data: bulletins }, { data: meetups }] = await Promise.all([
    admin
      .from('bulletins')
      .select('id, message, category, expires_at, created_at')
      .eq('campground_id', campground.id)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(30)
      .returns<BulletinRow[]>(),
    admin
      .from('meetups')
      .select('id, title, description, location, start_at, end_at')
      .eq('campground_id', campground.id)
      .gte('start_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(30)
      .returns<MeetupRow[]>(),
  ])

  // Meet-Other-Campers CTA target. For QUICK_CHECKIN_SLUGS (demo +
  // test campgrounds), the CTA routes to /quickcheckin — a public
  // no-signup form that provisions a throwaway camper account in
  // one click. For every other campground we keep the standard
  // /signup → email-confirm → /checkin flow.
  const useQuickCheckIn = isQuickCheckInSlug(campground.slug) && !!resolvedToken
  const checkInUrlSigned = resolvedToken
    ? `/checkin?token=${resolvedToken}`
    : '/checkin'
  const meetOtherCampersUrl = useQuickCheckIn
    ? `/quickcheckin?slug=${encodeURIComponent(campground.slug)}&token=${resolvedToken}`
    : resolvedToken
      ? `/signup?next=${encodeURIComponent(checkInUrlSigned)}`
      : '/signup'

  const where = [campground.city, campground.region]
    .filter(Boolean)
    .join(', ')

  // Track whether ANY owner-edited content card renders, so we can
  // decide whether to show a "No campground info yet" empty state.
  // (For now we never show an empty state — the engagement hub +
  // Meet Other Campers card render unconditionally — but the count
  // is here for any future use.)

  return (
    <main className="min-h-screen bg-night text-cream">
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href={
            resolvedToken
              ? `/login?next=${encodeURIComponent(checkInUrlSigned)}`
              : '/login'
          }
          className="text-xs font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </header>

      {/* Mobile bottom padding accounts for iOS Safari's URL bar and
          the home-indicator safe area so the trailing CTA isn't
          covered. */}
      <article className="px-4 pb-[calc(env(safe-area-inset-bottom)+8rem)] sm:pb-24">
        <div className="mx-auto max-w-xl space-y-10">
          {/* ----- Welcome header ----- */}
          <section className="text-center space-y-4 pt-4 sm:pt-8">
            {campground.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- partner logos are remote, dimensions vary
              <img
                src={campground.logo_url}
                alt={`${campground.name} logo`}
                className="mx-auto h-20 w-auto rounded-2xl border border-white/10 bg-card p-3 object-contain"
              />
            ) : (
              <div className="mx-auto h-20 w-20 rounded-2xl border border-flame/30 bg-flame/[0.06] grid place-items-center">
                <span className="font-display text-2xl font-extrabold text-flame">
                  {campground.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                Welcome to
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-[1.05]">
                {campground.name}
              </h1>
              {where && (
                <p className="text-sm sm:text-base text-mist">{where}</p>
              )}
            </div>
            <p className="text-cream/90 text-sm leading-relaxed max-w-md mx-auto pt-1">
              Park info, updates, help, feedback, reviews, rebooking, and
              optional camper connection. No app download required.
            </p>
          </section>

          {/* No-login confirmation strip — quietly tells the visitor
              this whole page works without an account. The "Meet Other
              Campers — Optional" card near the bottom is the only
              surface that asks for one. */}
          <section
            role="status"
            className="rounded-2xl border border-leaf/30 bg-leaf/[0.06] px-4 py-3 text-center"
          >
            <p className="text-xs text-mist leading-snug">
              No login required to use this page. Optional camper
              connection at the bottom.
            </p>
          </section>

          {/* Park Map. URL fallback (mig 0048) + uploaded file (mig
              0051). Renders only when the owner has flipped
              show_park_map on AND at least one of (uploaded file,
              URL) is set. The uploaded file takes precedence; the URL
              is the fallback for owners who'd rather paste a link.
              Three render variants:
                * Uploaded IMAGE -> inline preview + "Open full size"
                  link. Tapping the image opens the raw asset in a new
                  tab so the mobile browser's native viewer handles
                  pinch-zoom for free.
                * Uploaded PDF   -> "View Park Map (PDF)" card; opens
                  the PDF in a new tab.
                * URL fallback   -> the original tap-anywhere card.
              All three open in a new tab so the guest's place in the
              hub isn't lost; rel keeps the parent tab safe from
              window.opener tampering. */}
          {(() => {
            if (!campground.show_park_map) return null
            const fileUrl = campground.park_map_path
            const fileType = campground.park_map_file_type
            const fallbackUrl = campground.park_map_url
            const sourceUrl = fileUrl ?? fallbackUrl
            if (!sourceUrl) return null

            const isUploadedImage =
              !!fileUrl &&
              (fileType === 'image/png' ||
                fileType === 'image/jpeg' ||
                fileType === 'image/webp')
            const isUploadedPdf =
              !!fileUrl && fileType === 'application/pdf'

            if (isUploadedImage) {
              return (
                <section className="space-y-3">
                  <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                    Park map
                  </h2>
                  <div className="rounded-2xl border border-leaf/30 bg-leaf/[0.06] p-3 sm:p-4 space-y-3">
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border border-white/5 bg-night/40 hover:border-leaf/60 transition-colors"
                      aria-label="Open the campground map at full size"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded asset, dimensions vary */}
                      <img
                        src={sourceUrl}
                        alt={`Campground map for ${campground.name}`}
                        className="block w-full h-auto max-h-[60vh] object-contain bg-night/30"
                      />
                    </a>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-mist leading-snug">
                        Find the office, amenities, bathhouse, laundry,
                        trails, and other park areas.
                      </p>
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-leaf/40 bg-leaf/[0.10] text-cream px-3 py-1.5 text-xs font-semibold hover:bg-leaf/[0.18] hover:border-leaf/60 transition-colors"
                      >
                        Open full size <span aria-hidden>↗</span>
                      </a>
                    </div>
                    {campground.park_map_notes && (
                      <p className="text-xs text-mist leading-snug whitespace-pre-wrap pt-0.5">
                        {campground.park_map_notes}
                      </p>
                    )}
                  </div>
                </section>
              )
            }

            // PDF upload OR plain URL fallback -- both render as a
            // tap-anywhere card with the link icon. The CTA text
            // adapts to the source so a guest knows what tapping will
            // do.
            const ctaText = isUploadedPdf
              ? 'View Park Map (PDF)'
              : 'Open the park map'
            return (
              <section className="space-y-3">
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                  Park map
                </h2>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl border border-leaf/30 bg-leaf/[0.06] p-4 sm:p-5 hover:border-leaf/60 hover:bg-leaf/[0.10] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-leaf/40 bg-leaf/15 text-xl"
                    >
                      {isUploadedPdf ? '📄' : '🗺️'}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-cream">
                        {ctaText}
                      </p>
                      {campground.park_map_notes ? (
                        <p className="text-xs text-mist leading-snug whitespace-pre-wrap">
                          {campground.park_map_notes}
                        </p>
                      ) : (
                        <p className="text-xs text-mist leading-snug">
                          Find the office, amenities, bathhouse,
                          laundry, trails, and other park areas.
                        </p>
                      )}
                    </div>
                    <span
                      aria-hidden
                      className="text-leaf shrink-0 text-sm font-semibold"
                    >
                      ↗
                    </span>
                  </div>
                </a>
              </section>
            )
          })()}

          {/* Wi-Fi (mig 0049). Renders when toggle is on AND a network
              name is set. Password rendered as monospace + select-all
              so a guest can tap-to-copy on mobile. */}
          {campground.show_wifi && campground.wifi_network_name && (
            <section className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                Wi-Fi
              </h2>
              <div className="rounded-2xl border border-leaf/30 bg-leaf/[0.06] p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-leaf/40 bg-leaf/15 text-xl"
                  >
                    📶
                  </span>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-mist/80 font-semibold">
                        Network
                      </p>
                      <p className="text-sm font-semibold text-cream break-all">
                        {campground.wifi_network_name}
                      </p>
                    </div>
                    {campground.wifi_password && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-mist/80 font-semibold">
                          Password
                        </p>
                        <p className="text-sm font-mono font-semibold text-cream break-all select-all">
                          {campground.wifi_password}
                        </p>
                      </div>
                    )}
                    {campground.wifi_notes && (
                      <p className="text-xs text-mist leading-snug whitespace-pre-wrap pt-1">
                        {campground.wifi_notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Emergency Info (mig 0049). Card renders when toggle is
              on AND at least one field has content. Amber border
              signals importance without screaming red. */}
          {campground.show_emergency_info &&
            (campground.emergency_contact_number ||
              campground.emergency_after_hours ||
              campground.emergency_shelter_notes ||
              campground.emergency_other_notes) && (
              <section className="space-y-3">
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-amber-300 font-semibold">
                  Emergency info
                </h2>
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 sm:p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-400/40 bg-amber-400/15 text-xl"
                    >
                      🚨
                    </span>
                    <div className="flex-1 min-w-0 space-y-3">
                      {campground.emergency_contact_number && (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80 font-semibold">
                            Primary contact
                          </p>
                          <p className="text-sm font-semibold text-cream break-all">
                            {campground.emergency_contact_number}
                          </p>
                        </div>
                      )}
                      {campground.emergency_after_hours && (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80 font-semibold">
                            After hours
                          </p>
                          <p className="text-sm text-cream whitespace-pre-wrap">
                            {campground.emergency_after_hours}
                          </p>
                        </div>
                      )}
                      {campground.emergency_shelter_notes && (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80 font-semibold">
                            Storm shelter &amp; evacuation
                          </p>
                          <p className="text-sm text-cream whitespace-pre-wrap leading-relaxed">
                            {campground.emergency_shelter_notes}
                          </p>
                        </div>
                      )}
                      {campground.emergency_other_notes && (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80 font-semibold">
                            Other emergency info
                          </p>
                          <p className="text-sm text-cream whitespace-pre-wrap leading-relaxed">
                            {campground.emergency_other_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

          {/* Rules & Policies (mig 0049). Free-form text; line breaks
              preserved with whitespace-pre-wrap. */}
          {campground.show_rules && campground.rules_text && (
            <section className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                Rules &amp; policies
              </h2>
              <div className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5">
                <p className="text-sm text-cream whitespace-pre-wrap leading-relaxed">
                  {campground.rules_text}
                </p>
              </div>
            </section>
          )}

          {/* Local Recommendations (mig 0049). Free-form text for now;
              line breaks preserved. */}
          {campground.show_local_recommendations &&
            campground.local_recommendations_text && (
              <section className="space-y-3">
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                  Local recommendations
                </h2>
                <div className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5">
                  <p className="text-sm text-cream whitespace-pre-wrap leading-relaxed">
                    {campground.local_recommendations_text}
                  </p>
                </div>
              </section>
            )}

          {/* Campground announcements (bulletins) */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              Campground announcements
            </h2>
            {bulletins && bulletins.length > 0 ? (
              <ul className="space-y-3">
                {bulletins.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${categoryColor(b.category)}`}
                      >
                        {categoryLabel(b.category)}
                      </span>
                      <span className="text-[11px] text-mist/70">
                        {formatPostedAt(b.created_at)}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-cream leading-relaxed whitespace-pre-wrap">
                      {b.message}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-card/60 p-5 text-center text-sm text-mist">
                No active announcements right now. Check back later.
              </p>
            )}
          </section>

          {/* Upcoming meetups */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              Upcoming meetups
            </h2>
            {meetups && meetups.length > 0 ? (
              <ul className="space-y-3">
                {meetups.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 space-y-2"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
                      {formatMeetupTime(m.start_at, m.end_at)}
                    </p>
                    <h3 className="font-display text-lg font-extrabold text-cream leading-tight">
                      {m.title}
                    </h3>
                    {m.location && (
                      <p className="text-sm text-mist">
                        <span aria-hidden>📍 </span>
                        {m.location}
                      </p>
                    )}
                    {m.description && (
                      <p className="text-sm text-cream/90 leading-relaxed whitespace-pre-wrap">
                        {m.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-card/60 p-5 text-center text-sm text-mist">
                No meetups scheduled right now.
              </p>
            )}
          </section>

          {/* Campground Amenities — dedicated, labeled section. Renders
              standard + custom amenities (in display order) as a 2-col
              mobile / 3-col desktop card grid. Each card shows the
              amenity name plus the optional owner-written note from
              campgrounds.amenity_notes (migration 0045). Custom
              amenities the owner typed get a dashed-flame border so
              they're visually distinct from the brand-curated presets.
              Hidden entirely when the campground has no amenities. */}
          {(() => {
            const { standard, custom } = splitAmenities(campground.amenities)
            const all = [
              ...standard.map((label) => ({ label, isCustom: false })),
              ...custom.map((label) => ({ label, isCustom: true })),
            ]
            if (all.length === 0) return null
            const notes = campground.amenity_notes ?? {}
            return (
              <section className="space-y-3">
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                  Campground amenities
                </h2>
                <ul className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 pt-1">
                  {all.map((a) => {
                    const note =
                      typeof notes[a.label] === 'string'
                        ? notes[a.label].trim()
                        : ''
                    return (
                      <li
                        key={`${a.isCustom ? 'c' : 's'}-${a.label}`}
                        className={
                          a.isCustom
                            ? 'rounded-xl border border-dashed border-flame/40 bg-card/40 p-3 sm:p-4 space-y-1'
                            : 'rounded-xl border border-white/5 bg-card p-3 sm:p-4 space-y-1'
                        }
                      >
                        <p className="text-sm font-semibold text-cream leading-tight">
                          {a.label}
                        </p>
                        {note && (
                          <p className="text-xs text-mist leading-snug">
                            {note}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })()}

          {/* Helpful Campground Links — Visit Website + Call Office. */}
          {(campground.website || campground.phone) && (
            <section className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                Helpful campground links
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {campground.website && (
                  <TrackedLinkButton
                    href={campground.website}
                    campgroundId={campground.id}
                    eventType="campground_website_click"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-4 py-3 text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
                  >
                    <span aria-hidden>🌐</span>
                    Visit campground website
                  </TrackedLinkButton>
                )}
                {campground.phone && (
                  <a
                    href={`tel:${campground.phone.replace(/[^0-9+]/g, '')}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-4 py-3 text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
                  >
                    <span aria-hidden>📞</span>
                    Call the office
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Engagement Hub — Pulse Check ("How's your stay?"), Leave a
              Review, Book Your Next Stay, and the categorized Contact
              the Office form. Each surface is independently gated on
              its owner-set feature flag AND its data dependency; if
              every flag is off the component renders nothing. */}
          <WelcomeEngagement
            campgroundId={campground.id}
            reviewUrl={campground.google_review_url}
            reviewEnabled={campground.feature_review_enabled}
            bookingUrl={campground.booking_url}
            bookingMessage={campground.booking_message}
            bookingPromoCode={campground.booking_promo_code}
            bookingEnabled={campground.feature_book_again_enabled}
            contactEnabled={campground.feature_contact_office_enabled}
            pulseEnabled={campground.feature_pulse_check_enabled}
          />

          {/* ----- Meet Other Campers — Optional ----- */}
          {/* The ONLY surface on this page that triggers a signup/login.
              Per the guest-hub pivot, RoadWave is useful first
              (everything above) and social second. This card invites
              guests into the optional camper-connection feature with
              an honest explanation of what it requires (an account)
              and what they get in return (private waves, visibility
              modes, never any site numbers). */}
          <section className="space-y-3 pt-2">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              Meet other campers — optional
            </h2>
            <div className="rounded-2xl border border-flame/30 bg-flame/[0.05] p-5 space-y-4">
              <div className="space-y-2">
                <p className="text-base font-semibold text-cream leading-snug">
                  Want to meet nearby campers?
                </p>
                <p className="text-sm text-cream/90 leading-relaxed">
                  Create a free RoadWave profile to wave at campers with
                  shared interests. You control whether you are
                  visible, quiet, or invisible. Exact site numbers are
                  never shown.
                </p>
              </div>
              <ul className="space-y-1 text-xs text-mist leading-snug">
                <li className="flex items-start gap-2">
                  <span className="text-flame mt-0.5" aria-hidden>
                    ✓
                  </span>
                  <span>No public group chat. Waves stay private.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-flame mt-0.5" aria-hidden>
                    ✓
                  </span>
                  <span>
                    Switch to Updates Only any time to disappear from
                    other campers.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-flame mt-0.5" aria-hidden>
                    ✓
                  </span>
                  <span>
                    Your check-in expires automatically — no permanent
                    location footprint.
                  </span>
                </li>
              </ul>
              <Link
                href={meetOtherCampersUrl}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
              >
                Check In to This Campground <span aria-hidden>👋</span>
              </Link>
              <p className="text-[11px] text-mist/70 leading-snug text-center">
                RoadWave is an optional 18+ guest amenity. Not an
                emergency service — call 911 first, then notify
                campground staff.
              </p>
            </div>
          </section>
        </div>
      </article>
    </main>
  )
}

function categoryLabel(c: BulletinRow['category']): string {
  switch (c) {
    case 'event':
      return 'Event'
    case 'special':
      return 'Special'
    case 'alert':
      return 'Alert'
    case 'general':
    default:
      return 'Update'
  }
}

function categoryColor(c: BulletinRow['category']): string {
  // Alert lights up red so storm/weather notices stand out at a glance;
  // everything else uses the brand amber.
  return c === 'alert' ? 'text-red-300' : 'text-flame'
}

// Posted timestamp in a relative form when fresh, absolute when older.
function formatPostedAt(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

// Meetup time: "Today, 7:00 PM" / "Tomorrow, 8:00 AM" / "Sat Jul 12, 6:30 PM"
// — with optional end time appended.
function formatMeetupTime(startIso: string, endIso: string | null): string {
  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) return ''

  const today = new Date()
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  let dayPart: string
  if (isSameDay(start, today)) dayPart = 'Today'
  else if (isSameDay(start, tomorrow)) dayPart = 'Tomorrow'
  else
    dayPart = start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  }
  const startTime = start.toLocaleTimeString(undefined, timeOpts)

  if (!endIso) return `${dayPart}, ${startTime}`

  const end = new Date(endIso)
  if (Number.isNaN(end.getTime())) return `${dayPart}, ${startTime}`

  const endTime = end.toLocaleTimeString(undefined, timeOpts)
  return `${dayPart}, ${startTime} – ${endTime}`
}
