import Link from 'next/link'
import { ArrivalDepartureCard } from '@/components/campgrounds/arrival-departure-card'
import { CriticalBanner } from '@/components/campgrounds/critical-banner'
import { HappeningSection } from '@/components/campgrounds/happening-section'
import { Lantern } from '@/components/campgrounds/lantern'
import type { AuthCampgroundContext } from '@/lib/auth/auth-campground-context'

// Campground-aware header surfaced on /login and /signup when the
// camper came from a campground QR page. Mirrors the practical
// info the QR landing page shows so the auth surface doesn't feel
// like a separate, disconnected world:
//
//   * Campground name + logo + address (same data the hub renders)
//   * Lantern badge — listens for bulletin/meetup/critical events
//     dispatched by the embedded HappeningSection + CriticalBanner
//     so the auth surface lights up the same way the hub does
//   * Critical weather/safety banner (auto-hides when no active
//     is_critical bulletin)
//   * Arrival & Departure card (auto-hides when no times set)
//   * Happening at <name> — bulletins + meetups (auto-hides when
//     both lists are empty; polls itself for live updates)
//   * "Back to campground info" link — escape hatch so a camper who
//     tapped Sign in by mistake can return to the QR hub without
//     scanning again
//
// All of the live components above are the same client islands the
// hub mounts. Their poll endpoints are public, and they no-op on
// empty data, so they're safe to render on the unauthenticated
// auth pages.

export function AuthCampgroundContextStrip({
  ctx,
}: {
  ctx: AuthCampgroundContext
}) {
  const cg = ctx.campground
  const where = [cg.city, cg.region].filter(Boolean).join(', ')

  return (
    <div className="space-y-5">
      {/* Header row: campground logo + name + Lantern. Mirrors the
          public QR header so a camper sees the same chrome on both
          surfaces. */}
      <div className="rounded-2xl border border-flame/20 bg-flame/[0.04] p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-3">
          {cg.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- partner logos are remote, dimensions vary
            <img
              src={cg.logo_url}
              alt={`${cg.name} logo`}
              className="h-12 w-12 rounded-xl border border-white/10 bg-card p-1.5 object-contain shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl border border-flame/30 bg-flame/[0.06] grid place-items-center shrink-0">
              <span className="font-display text-lg font-extrabold text-flame">
                {cg.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
              Signing in at
            </p>
            <p className="font-display text-lg font-extrabold text-cream truncate leading-tight">
              {cg.name}
            </p>
            {cg.address ? (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(cg.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline truncate block"
              >
                {cg.address}
              </a>
            ) : where ? (
              <p className="text-xs text-mist truncate">{where}</p>
            ) : null}
          </div>
          <Lantern campgroundId={cg.id} campgroundSlug={cg.slug} />
        </div>
        <Link
          href={`/campground/${cg.slug}`}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-cream px-3 py-2 text-xs font-semibold hover:bg-white/10 hover:border-white/30 transition-colors"
        >
          ← Back to campground info
        </Link>
      </div>

      {/* Critical weather/safety. Renders nothing when no active
          is_critical bulletin -- safe to always mount. */}
      <div id="critical-notice" className="scroll-mt-4">
        <CriticalBanner campgroundId={cg.id} initial={ctx.critical} />
      </div>

      {/* Arrival & Departure. Hides itself when no times are set. */}
      <ArrivalDepartureCard
        checkInTime={cg.check_in_time}
        checkOutTime={cg.check_out_time}
        earlyCheckInNote={cg.early_check_in_note}
        lateCheckOutNote={cg.late_check_out_note}
        arrivalDepartureNote={cg.arrival_departure_note}
      />

      {/* Happening at <name>. Auto-hides when both bulletins and
          meetups lists are empty; polls itself for live updates. */}
      <HappeningSection
        campgroundSlug={cg.slug}
        campgroundId={cg.id}
        campgroundName={cg.name}
        initialBulletins={ctx.bulletins}
        initialMeetups={ctx.meetups}
      />
    </div>
  )
}
