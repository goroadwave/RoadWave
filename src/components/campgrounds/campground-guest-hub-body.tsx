import Link from 'next/link'
import { CamperToastHost } from '@/components/campgrounds/camper-toast-host'
import { CriticalBanner } from '@/components/campgrounds/critical-banner'
import { DisclosureSection } from '@/components/campgrounds/disclosure-section'
import { HappeningSection } from '@/components/campgrounds/happening-section'
import { Lantern } from '@/components/campgrounds/lantern'
import { TrackedLinkButton } from '@/components/campgrounds/tracked-link-button'
import { WelcomeEngagement } from '@/components/campgrounds/welcome-engagement'
import { WifiCopyButton } from '@/components/campgrounds/wifi-copy-button'
import { Logo } from '@/components/ui/logo'
import { splitAmenities } from '@/lib/campgrounds/amenities'
import { isQuickCheckInSlug } from '@/lib/checkin/quick-checkin-slugs'

// Shared body for the public guest QR landing page AND the owner-only
// preview at /owner/preview. Both routes render identical content from
// identical data so the preview never drifts from what guests see.
//
// The page-level wrapper handles auth/redirect/event-logging — those
// concerns are deliberately NOT inside this component:
//   * /campground/[slug]/page.tsx runs the redirect-to-/checkin gate
//     for authed visitors with a real token + fires the qr_scan /
//     bulletin_view / updates_only_view event-log entries.
//   * /owner/preview/page.tsx runs the owner auth gate + skips ALL
//     event logging (an owner's preview clicks must not pollute stats).
//
// The previewMode prop only affects in-component side-effect surfaces
// (engagement form submissions + tracked-link click logging). Visual
// rendering is identical in both modes; the page-level wrapper adds
// the preview banner.

// Minimal shape of a campground row this component renders from. The
// page-level wrapper selects these columns from public.campgrounds
// (or via the owner-authed helper for the preview path) and hands
// them down. Optional fields default to behaviour that hides the
// associated card when null/false.
export type GuestHubCampground = {
  id: string
  slug: string
  name: string
  city: string | null
  region: string | null
  logo_url: string | null
  amenities: string[] | null
  amenity_notes: Record<string, string> | null
  website: string | null
  phone: string | null
  /** Phase 4a -- campground street address, shown directly under
   *  the name on the welcome page as a tappable maps link so a
   *  guest can confirm they're at the right place + open
   *  navigation in one tap. NULL hides the line. */
  address: string | null
  google_review_url: string | null
  booking_url: string | null
  booking_message: string | null
  booking_promo_code: string | null
  // Facebook CTA fields (mig 0057). Optional surface; button only
  // renders when feature_facebook_enabled is true AND
  // facebook_review_url is non-null. facebook_button_label is the
  // owner-customizable CTA text; the welcome page falls back to
  // "Recommend Us on Facebook" when null.
  feature_facebook_enabled: boolean
  facebook_review_url: string | null
  facebook_button_label: string | null
  feature_review_enabled: boolean
  feature_book_again_enabled: boolean
  feature_contact_office_enabled: boolean
  feature_pulse_check_enabled: boolean
  // Park Map (mig 0048 URL fallback + mig 0051 file upload).
  show_park_map: boolean
  park_map_url: string | null
  park_map_notes: string | null
  park_map_path: string | null
  park_map_file_type: string | null
  // Guest-hub sections (mig 0049).
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

export type GuestHubBulletin = {
  id: string
  message: string
  category: 'event' | 'special' | 'alert' | 'general'
  expires_at: string | null
  created_at: string
}

export type GuestHubMeetup = {
  id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string | null
}

// Phase 3c -- minimal shape needed by the CriticalBanner client
// island. Pulled from the most recent active is_critical bulletin
// (mig 0058) in the SSR fetch + the dynamic poll. Null when no
// critical bulletin is active for this campground.
export type GuestHubCritical = {
  id: string
  message: string
  expires_at: string | null
  created_at: string
}

type Props = {
  campground: GuestHubCampground
  bulletins: GuestHubBulletin[]
  meetups: GuestHubMeetup[]
  critical: GuestHubCritical | null
  /** Canonical QR token for this campground. Drives the URL of the
   *  Meet Other Campers CTA — when present, the camper lands on the
   *  check-in flow with the token preserved; when null, they land
   *  on the generic /signup or /checkin route. */
  resolvedToken: string | null
  /** True when rendered inside /owner/preview. Disables stat-event
   *  logging and form submissions while keeping all visual surfaces
   *  identical to the live guest page. */
  previewMode?: boolean
}

export function CampgroundGuestHubBody({
  campground,
  bulletins,
  meetups,
  critical,
  resolvedToken,
  previewMode = false,
}: Props) {
  // Meet-Other-Campers CTA target. For QUICK_CHECKIN_SLUGS (demo +
  // test campgrounds), the CTA routes to /quickcheckin — a public
  // no-signup form that provisions a throwaway camper account in
  // one click. For every other campground we keep the standard
  // /signup → email-confirm → /checkin flow.
  const useQuickCheckIn =
    isQuickCheckInSlug(campground.slug) && !!resolvedToken
  const checkInUrlSigned = resolvedToken
    ? `/checkin?token=${resolvedToken}`
    : '/checkin'
  const meetOtherCampersUrl = useQuickCheckIn
    ? `/quickcheckin?slug=${encodeURIComponent(campground.slug)}&token=${resolvedToken}`
    : resolvedToken
      ? `/signup?next=${encodeURIComponent(checkInUrlSigned)}`
      : '/signup'

  const where = [campground.city, campground.region].filter(Boolean).join(', ')

  // Phase 2 -- precompute Quick Actions visibility. Each button shows
  // only when its target section will actually render, so anchor links
  // never scroll to a hidden block. Section IDs (id="park-map" etc.)
  // are set below where each target section renders.
  const hasParkMapSource =
    !!campground.park_map_path || !!campground.park_map_url
  const showParkMapAction = campground.show_park_map && hasParkMapSource
  const showWifiAction =
    campground.show_wifi && !!campground.wifi_network_name
  const showContactAction = campground.feature_contact_office_enabled
  const showCallAction = !!campground.phone
  const showQuickActions =
    showParkMapAction || showWifiAction || showContactAction || showCallAction

  // Phase 2 -- precompute Emergency Info visibility (used twice: in the
  // "any emergency content?" gate AND when deciding whether to render
  // the moved-up critical-notice block near the top of the page).
  const showEmergencyInfo =
    campground.show_emergency_info &&
    !!(
      campground.emergency_contact_number ||
      campground.emergency_after_hours ||
      campground.emergency_shelter_notes ||
      campground.emergency_other_notes
    )

  // Phase 2 -- amenities precomputed once for both the visibility check
  // and the render. Was inline IIFE before; lifted here so a single
  // splitAmenities call covers both uses.
  const splitAmen = splitAmenities(campground.amenities)
  const allAmenities = [
    ...splitAmen.standard.map((label) => ({ label, isCustom: false })),
    ...splitAmen.custom.map((label) => ({ label, isCustom: true })),
  ]
  const amenityNotes = campground.amenity_notes ?? {}

  // Quick Action button style. One rounded card per action, tap-target
  // sized for thumb on mobile (≥44px) and grid-aligned at the page max
  // width. Identical structure to existing Helpful-Links buttons so
  // visual consistency stays.
  const quickActionCls =
    'inline-flex items-center justify-center gap-1.5 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-3 py-3 text-xs sm:text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors leading-tight text-center'

  return (
    <main className="min-h-screen bg-night text-cream">
      {/* Server-rendered inline scroll-pin script -- runs
          synchronously as the browser parses this point in the
          HTML, BEFORE any auto scroll restoration kicks in.
          Earlier single-shot versions of this script were
          insufficient: Next.js Google Fonts swap (3 typefaces),
          React hydration of late-mounting islands (CriticalBanner,
          HappeningSection, OfficeHelpCard auto-opening when the
          camper has a stored thread), and the park-map image load
          all shifted layout AFTER the script's one scrollTo fired.
          The browser's "preserve scroll relative to new height"
          logic could then end up landing the camper mid-page.

          The fix: pin scroll to (0,0) every 30ms for up to 3
          seconds, stopping early on any user interaction. That
          covers the entire layout-stabilization window without
          fighting the user if they intentionally scroll within
          the first 3 seconds. Also handles 'pageshow' (bfcache
          restoration from back-forward navigation in modern
          browsers) and 'load' (all resources fully loaded). All
          guards are skipped when the URL has an explicit hash so
          anchor links (#office-help, #park-map, etc.) still work.

          pin() sets every available scroll surface -- window,
          documentElement, body, and document.scrollingElement --
          so a layout context that ignores one (Safari overscroll
          on body vs html, etc.) still gets pinned by another. */}
      {!previewMode && (
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if('scrollRestoration' in history){history.scrollRestoration='manual'}if(location.hash.length<=1){var pin=function(){window.scrollTo(0,0);if(document.scrollingElement)document.scrollingElement.scrollTop=0;document.documentElement.scrollTop=0;document.body&&(document.body.scrollTop=0)};pin();var stop=false;var halt=function(){stop=true};var ev=['touchstart','pointerdown','wheel','keydown'];for(var i=0;i<ev.length;i++)window.addEventListener(ev[i],halt,{once:true,passive:ev[i]!=='keydown'});var n=0;var id=setInterval(function(){n++;if(n>100||stop||location.hash.length>1){clearInterval(id);return}pin()},30);window.addEventListener('load',function(){if(!stop&&location.hash.length<=1)pin()});window.addEventListener('pageshow',function(e){if(e.persisted&&location.hash.length<=1)pin()})}}catch(e){}",
          }}
        />
      )}
      <header className="px-4 py-5 flex items-center justify-between gap-3">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <div className="flex items-center gap-3">
          {/* Phase 3b -- Lantern lives top-right next to Sign in.
              Dim by default, lights up + shows a count when there's
              a new bulletin, meetup, or office reply the camper
              hasn't seen yet. Driven entirely by client events from
              the existing pollers (BulletinsList, MeetupsList,
              CamperMessageTracker) -- no extra network calls. */}
          <Lantern
            campgroundId={campground.id}
            campgroundSlug={campground.slug}
            previewMode={previewMode}
          />
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
        </div>
      </header>

      {/* Mobile bottom padding accounts for iOS Safari's URL bar and
          the home-indicator safe area so the trailing CTA isn't
          covered. */}
      <article className="px-4 pb-[calc(env(safe-area-inset-bottom)+8rem)] sm:pb-24">
        <div className="mx-auto max-w-xl space-y-10">
          {/* Phase 3c -- Critical weather / safety notice. Pinned at
              the very top of the page when there's an active
              is_critical bulletin. Renders nothing when there isn't.
              Camper can acknowledge to collapse to a small chip; the
              chip stays until the bulletin expires or the owner
              deactivates it. id="critical-notice" is the Lantern's
              anchor target. */}
          <div id="critical-notice" className="scroll-mt-4">
            <CriticalBanner
              campgroundId={campground.id}
              initial={critical}
              previewMode={previewMode}
            />
          </div>

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
              {/* Phase 4a -- address tappable, opens user's default
                  maps app via the universal Google Maps URL (works
                  on iOS Safari, Android Chrome, and desktop). When
                  no address is set we still render the city/region
                  line for context, just not as a link. */}
              {campground.address ? (
                // Text-only tappable address -- opens the user's
                // default maps app on tap. No pin emoji / icon per
                // design: keep the welcome header clean and let the
                // hover underline carry the affordance.
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(campground.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm sm:text-base text-mist hover:text-cream underline-offset-2 hover:underline"
                >
                  {campground.address}
                </a>
              ) : where ? (
                <p className="text-sm sm:text-base text-mist">{where}</p>
              ) : null}
            </div>
            <p className="text-cream/90 text-sm leading-relaxed max-w-md mx-auto pt-1">
              Quick access to the park map, Wi-Fi, campground rules,
              office help, updates, and optional camper connections.
            </p>
          </section>

          {/* Phase 2 -- Emergency / critical notice moved up so any
              storm shelter, after-hours, or "primary contact" info is
              visible without scrolling. Same content as the original
              "Emergency info" section; just re-positioned. Hidden when
              the owner hasn't enabled emergency info OR has set no
              fields. */}
          {showEmergencyInfo && (
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
                        {/* Tappable phone -- digit-only href so the
                            dialer doesn't choke on spaces / parens /
                            dashes, but the human-readable form stays
                            visible to the camper. Mobile opens the
                            dialer; desktop just selects/copies. */}
                        <p className="text-sm font-semibold text-cream break-all">
                          <a
                            href={`tel:${campground.emergency_contact_number.replace(/[^0-9+]/g, '')}`}
                            className="text-cream hover:text-amber-200 underline-offset-2 hover:underline"
                          >
                            {campground.emergency_contact_number}
                          </a>
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

          {/* Phase 2 -- Quick Actions strip. Anchor links jump straight
              to the section the camper needs. Each button is gated on
              the same data its target section is gated on, so we never
              show a button that scrolls to nothing. Hidden entirely
              when no buttons would render. */}
          {showQuickActions && (
            <section className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                Quick actions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {showParkMapAction && (
                  <a href="#park-map" className={quickActionCls}>
                    <span aria-hidden>🗺️</span>
                    <span>Open map</span>
                  </a>
                )}
                {showWifiAction && (
                  <a href="#wifi" className={quickActionCls}>
                    <span aria-hidden>📶</span>
                    <span>View Wi-Fi</span>
                  </a>
                )}
                {showContactAction && (
                  // Points at the unified Office Help & Messages
                  // section that wraps the persistent message
                  // tracker + Contact Office form (welcome-engagement
                  // owns the id="office-help" anchor).
                  <a href="#office-help" className={quickActionCls}>
                    <span aria-hidden>💬</span>
                    <span>Contact office</span>
                  </a>
                )}
                {showCallAction && campground.phone && (
                  <a
                    href={`tel:${campground.phone.replace(/[^0-9+]/g, '')}`}
                    className={quickActionCls}
                  >
                    <span aria-hidden>📞</span>
                    <span>Call office</span>
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Phase 4a -- "Happening at <name>" consolidates the old
              separate Bulletins + Meetups sections into one client
              island near the top. Single /api/campground/[slug]/dynamic
              poll, dispatches LANTERN_BULLETINS_EVENT /
              LANTERN_MEETUPS_EVENT / LANTERN_CRITICAL_EVENT so the
              Phase 3b Lantern + Phase 3c CriticalBanner keep working
              unchanged. Returns null when both lists are empty so
              the page doesn't waste vertical space on an empty
              announcements card. */}
          <HappeningSection
            campgroundSlug={campground.slug}
            campgroundId={campground.id}
            campgroundName={campground.name}
            initialBulletins={bulletins}
            initialMeetups={meetups}
          />

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
                <section id="park-map" className="space-y-3 scroll-mt-4">
                  <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                    Park map
                  </h2>
                  <div className="rounded-2xl border border-leaf/30 bg-leaf/[0.06] p-3 sm:p-4 space-y-3">
                    {/* aspect-[4/3] reserves stable vertical space
                        so the page doesn't grow when the image
                        finishes loading -- killing the CLS jump
                        that could land mobile campers mid-page on
                        reload even with the multi-tick scroll
                        guard in place. The image inside uses
                        object-contain so it letterboxes /
                        pillarboxes inside the slot whatever its
                        actual aspect ratio. max-h-[60vh] caps the
                        slot on tall viewports so a tall map
                        doesn't push the rest of the page out of
                        view on desktop. */}
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-[4/3] max-h-[60vh] rounded-xl overflow-hidden border border-white/5 bg-night/40 hover:border-leaf/60 transition-colors"
                      aria-label="Open the campground map at full size"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded asset, dimensions vary */}
                      <img
                        src={sourceUrl}
                        alt={`Campground map for ${campground.name}`}
                        loading="lazy"
                        decoding="async"
                        className="block h-full w-full object-contain bg-night/30"
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
              <section id="park-map" className="space-y-3 scroll-mt-4">
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
            <section id="wifi" className="space-y-3 scroll-mt-4">
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
                        {/* Phase 4a -- one-tap copy on mobile. The
                            password text stays select-all'd above as
                            a fallback for clipboard-API-disabled
                            browsers (Safari private mode, http
                            contexts). */}
                        <WifiCopyButton password={campground.wifi_password} />
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

          {/* Phase 2 -- the Emergency Info section moved up near the
              top so weather / after-hours / shelter info is visible
              without scrolling. See the moved-up version above. */}

          {/* Phase 2 -- Campground amenities, moved up so guests see
              what's available before scrolling past bulletins/meetups.
              Vertical 2-col (mobile) / 3-col (desktop) card grid with
              owner-written per-amenity notes from mig 0045. Custom
              amenities the owner typed get a dashed-flame border so
              they're visually distinct from the brand-curated presets.
              Hidden entirely when no amenities. */}
          {allAmenities.length > 0 && (
            // Phase 4b -- collapsed-by-default accordion for amenities.
            // The list still renders the same 2-col mobile / 3-col
            // desktop grid; just lives inside a DisclosureSection now.
            <DisclosureSection
              title="Campground amenities"
              description={`${allAmenities.length} listed`}
            >
              <ul className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
                {allAmenities.map((a) => {
                  const note =
                    typeof amenityNotes[a.label] === 'string'
                      ? amenityNotes[a.label].trim()
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
                        <p className="text-xs text-mist leading-snug">{note}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </DisclosureSection>
          )}

          {/* Rules & Policies (mig 0049). Phase 4b -- collapsed by
              default; the inner card chrome is removed since the
              disclosure provides the container. */}
          {campground.show_rules && campground.rules_text && (
            <DisclosureSection title="Rules & policies">
              <p className="text-sm text-cream whitespace-pre-wrap leading-relaxed">
                {campground.rules_text}
              </p>
            </DisclosureSection>
          )}

          {/* Local Recommendations (mig 0049). Phase 4b -- collapsed
              by default; same container treatment as Rules. */}
          {campground.show_local_recommendations &&
            campground.local_recommendations_text && (
              <DisclosureSection title="Local recommendations">
                <p className="text-sm text-cream whitespace-pre-wrap leading-relaxed">
                  {campground.local_recommendations_text}
                </p>
              </DisclosureSection>
            )}

          {/* Phase 4a -- old standalone Bulletins + Meetups sections
              consolidated into <HappeningSection> mounted higher on
              the page (right after Quick Actions). The bulletins
              and meetups <ul>s inside the new section keep the
              id="bulletins" / id="meetups" anchors so the Lantern's
              scroll-to behavior still works. */}

          {/* Phase 2 -- Amenities moved up near the Wi-Fi section.
              See the moved version higher on the page. */}

          {/* Visit campground website. Call Office moved to the Quick
              Actions strip at the top so a guest can dial in one tap
              from anywhere on the page. Hidden when no website set. */}
          {campground.website && (
            <section className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                Helpful campground links
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <TrackedLinkButton
                  href={campground.website}
                  campgroundId={campground.id}
                  eventType="campground_website_click"
                  previewMode={previewMode}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-4 py-3 text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
                >
                  <span aria-hidden>🌐</span>
                  Visit campground website
                </TrackedLinkButton>
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
            campgroundSlug={campground.slug}
            reviewUrl={campground.google_review_url}
            reviewEnabled={campground.feature_review_enabled}
            facebookUrl={campground.facebook_review_url}
            facebookButtonLabel={campground.facebook_button_label}
            facebookEnabled={campground.feature_facebook_enabled}
            bookingUrl={campground.booking_url}
            bookingMessage={campground.booking_message}
            bookingPromoCode={campground.booking_promo_code}
            bookingEnabled={campground.feature_book_again_enabled}
            contactEnabled={campground.feature_contact_office_enabled}
            pulseEnabled={campground.feature_pulse_check_enabled}
            previewMode={previewMode}
          />

          {/* ----- Meet Other Campers — Optional ----- */}
          {/* Always-visible static card (the previous DisclosureSection
              wrapper hid this behind a tap, which buried RoadWave's
              core differentiator on first scroll). Position stays
              below all the practical campground info so the optional
              social layer doesn't crowd Wi-Fi / map / office help, but
              the section itself is now visible without an extra
              interaction. The ONLY surface on this page that triggers
              a signup/login -- the meetOtherCampersUrl handoff
              preserves the campground context through /signup or
              /quickcheckin so the new account lands back here. */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              Meet other campers — optional
            </h2>
            <div className="rounded-2xl border border-flame/30 bg-flame/[0.05] p-5 sm:p-6 space-y-5">
              <div className="space-y-2">
                <p className="font-display text-xl sm:text-2xl font-extrabold text-cream leading-[1.15]">
                  Find your campground people without making it weird.
                </p>
                <p className="text-sm text-cream/90 leading-relaxed">
                  Create a free RoadWave profile to wave at nearby
                  campers who share your interests. You choose whether
                  you are visible, quiet, or invisible. Exact site
                  numbers are never shown.
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-mist leading-snug">
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
                    Connect around shared interests like campfires,
                    coffee, dog walks, hiking, fishing, games, or
                    local exploring.
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

              {/* How it works -- a 3-step numbered mini-card row so
                  campers get a one-glance mental model of the flow
                  before tapping the CTA. Numbers in pill chips for
                  scannability; labels short enough to fit a
                  three-column grid on iPhone-mini width without
                  wrapping awkwardly. Cards are decorative -- they
                  don't have their own CTAs. */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-flame font-semibold">
                  How it works
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { num: '1', label: 'Choose interests' },
                    { num: '2', label: 'Send a wave' },
                    { num: '3', label: 'Mutual hello' },
                  ].map((s) => (
                    <div
                      key={s.num}
                      className="rounded-xl border border-flame/20 bg-flame/[0.04] px-2 py-3 text-center space-y-1.5"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-flame/15 text-flame text-xs font-bold">
                        {s.num}
                      </span>
                      <span className="block text-[11px] text-cream leading-tight font-medium">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visibility pills -- small visual cue that the camper
                  controls how findable they are. Subtle color
                  variation (leaf for Visible, amber for Quiet, mist
                  for Invisible) reinforces the gradient without
                  competing with the primary CTA. Pure decoration --
                  the actual visibility picker lives in the profile
                  setup flow that the Join CTA leads to. */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-mist font-semibold">
                  You control your visibility
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf/30 bg-leaf/[0.06] px-2.5 py-1 text-[11px] font-medium text-leaf">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-leaf"
                    />
                    Visible
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/[0.06] px-2.5 py-1 text-[11px] font-medium text-amber-300">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-amber-300"
                    />
                    Quiet
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-mist">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-mist"
                    />
                    Invisible
                  </span>
                </div>
              </div>

              <Link
                href={meetOtherCampersUrl}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
              >
                Join Camper Connections <span aria-hidden>👋</span>
              </Link>
              {/* Demo link -- points at the existing public /demo page
                  in the Pages router (the "what would this look like
                  on a real campground" walkthrough). Kept as a small
                  muted text link so it sits below the primary CTA
                  without competing with it. */}
              <p className="text-center text-[12px] text-mist leading-snug">
                Curious how this works?{' '}
                <Link
                  href="/demo"
                  className="text-flame underline-offset-2 hover:underline"
                >
                  Try the quick demo.
                </Link>
              </p>
              <p className="text-[11px] text-mist/70 leading-snug text-center">
                RoadWave is an optional 18+ guest amenity. Not an
                emergency service — call 911 first, then notify
                campground staff.
              </p>
            </div>
          </section>
        </div>
      </article>

      {/* Phase 4c -- small in-page toasts for activity the camper
          would care about (office reply, new bulletin, new meetup).
          Subscribes to the Lantern events already fired by the
          existing pollers (CamperMessageTracker, HappeningSection),
          so this adds no new network calls. Only fires on activity
          that arrives AFTER mount. previewMode = true skips
          dispatch entirely so an owner previewing their own page
          doesn't see fake notifications driven by their own
          localStorage state. */}
      <CamperToastHost
        campgroundId={campground.id}
        previewMode={previewMode}
      />
    </main>
  )
}

// Phase 3a -- the categoryLabel / categoryColor / formatPostedAt /
// formatMeetupTime helpers moved to bulletins-list.tsx and
// meetups-list.tsx respectively, since those are the only callers
// after the lists became client islands. The helpers there mirror
// these byte-for-byte so first-paint output matches the SSR string
// and no hydration mismatch fires.
