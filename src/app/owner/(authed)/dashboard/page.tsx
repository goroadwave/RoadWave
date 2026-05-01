import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { TrialBanner } from '@/components/owner/trial-banner'
import { VisibilityBreakdown } from '@/components/owner/visibility-breakdown'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadOwnerCampground } from '../_helpers'

export default async function OwnerDashboardPage() {
  const { campground } = await loadOwnerCampground()
  if (!campground) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-extrabold text-cream">
          Welcome to RoadWave
        </h1>
        <p className="text-mist">
          We don&apos;t see a campground linked to your account yet.{' '}
          <Link
            href="/owner/profile"
            className="font-semibold text-flame underline-offset-2 hover:underline"
          >
            Finish setup on the profile page →
          </Link>
        </p>
      </div>
    )
  }

  const supabase = await createSupabaseServerClient()
  const nowIso = new Date().toISOString()

  // Active opt-in check-in count via SECURITY DEFINER RPC.
  const { data: checkedInCount } = await supabase.rpc(
    'owner_active_checkin_count',
    { _campground_id: campground.id },
  )

  // Per-mode visibility breakdown (added in migration 0032). Includes
  // campground_only guests who count toward activity stats but stay
  // invisible to other campers.
  type BreakdownRow = {
    visible_count: number
    quiet_count: number
    invisible_count: number
    campground_only_count: number
  }
  const { data: breakdownRow } = await supabase
    .rpc('owner_visibility_breakdown', { _campground_id: campground.id })
    .maybeSingle<BreakdownRow>()
  const breakdown = {
    visible: breakdownRow?.visible_count ?? 0,
    quiet: breakdownRow?.quiet_count ?? 0,
    invisible: breakdownRow?.invisible_count ?? 0,
    campground_only: breakdownRow?.campground_only_count ?? 0,
  }

  // Active bulletin (most recent unexpired).
  const { data: activeBulletin } = await supabase
    .from('bulletins')
    .select('id, message, category, created_at, expires_at')
    .eq('campground_id', campground.id)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const hasBulletin = !!activeBulletin || campground.onb_first_bulletin_sent

  // Onboarding checklist (spec §5):
  //   1. Download and print your QR code → onb_qr_printed (auto-marked
  //      when owner downloads from /owner/qr)
  //   2. Post it at your welcome sign → onb_qr_posted (manual toggle)
  //   3. Send your first guest bulletin → hasBulletin (auto from
  //      bulletins existence + onb_first_bulletin_sent latch)
  const checklist = [
    {
      label: 'Download and print your QR code',
      done: campground.onb_qr_printed,
      href: '/owner/qr',
    },
    {
      label: 'Post it at your welcome sign',
      done: campground.onb_qr_posted,
      href: '/owner/qr',
    },
    {
      label: 'Send your first guest bulletin',
      done: hasBulletin,
      href: '/owner/bulletin',
    },
  ]
  const incomplete = checklist.filter((c) => !c.done)

  return (
    <div className="space-y-6">
      <TrialBanner
        status={campground.subscription_status}
        trialEndsAt={campground.trial_ends_at}
      />
      <header className="flex items-center gap-4">
        {campground.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- simple <img> for owner-uploaded logo
          <img
            src={campground.logo_url}
            alt={`${campground.name} logo`}
            className="h-14 w-14 rounded-xl border border-white/10 bg-card object-cover"
          />
        ) : (
          <div className="h-14 w-14 rounded-xl border border-dashed border-white/15 bg-card grid place-items-center text-2xl">
            🏕️
          </div>
        )}
        <div>
          <Eyebrow>Your campground</Eyebrow>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream leading-tight">
            {campground.name}
          </h1>
          {!campground.is_active && (
            <span className="mt-1 inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">
              Inactive
            </span>
          )}
        </div>
      </header>

      <Link
        href="/owner/preview"
        className="block rounded-2xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 px-4 py-3 text-center transition-colors"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">
          Preview
        </p>
        <p className="mt-0.5 text-sm font-semibold text-cream">
          Preview Guest View →
        </p>
        <p className="mt-0.5 text-[11px] text-mist">
          See exactly what guests see after scanning your QR code.
        </p>
      </Link>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-mist">
            Checked in right now
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold text-cream">
            {checkedInCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-mist">
            Active guest check-ins. No names shown — privacy-first.
          </p>
        </div>
        <div className="rounded-2xl border border-flame/30 bg-flame/[0.04] p-4">
          <p className="text-xs uppercase tracking-wide text-flame">
            Active bulletin
          </p>
          {activeBulletin ? (
            <>
              <p className="mt-1 text-sm text-cream leading-snug">
                {activeBulletin.message}
              </p>
              <Link
                href="/owner/bulletin"
                className="mt-2 inline-block text-xs font-semibold text-flame underline-offset-2 hover:underline"
              >
                Manage →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-mist">
                No bulletin posted right now.
              </p>
              <Link
                href="/owner/bulletin"
                className="mt-2 inline-block text-xs font-semibold text-flame underline-offset-2 hover:underline"
              >
                Post one →
              </Link>
            </>
          )}
        </div>
      </section>

      <VisibilityBreakdown counts={breakdown} />

      {incomplete.length > 0 && (
        <section className="space-y-3">
          <Eyebrow>Setup checklist</Eyebrow>
          <ul className="rounded-2xl border border-white/5 bg-card divide-y divide-white/5 overflow-hidden">
            {checklist.map((c, i) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <span
                    className={
                      c.done
                        ? 'grid h-6 w-6 place-items-center rounded-full bg-leaf/20 text-leaf text-xs font-bold'
                        : 'grid h-6 w-6 place-items-center rounded-full border border-white/15 text-mist text-xs font-bold'
                    }
                  >
                    {c.done ? '✓' : i + 1}
                  </span>
                  <span
                    className={
                      c.done ? 'flex-1 text-sm text-mist line-through' : 'flex-1 text-sm text-cream'
                    }
                  >
                    {c.label}
                  </span>
                  <span aria-hidden className="text-mist">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <Tile href="/owner/profile" title="Campground profile" desc="Address, amenities, logo." />
        <Tile href="/owner/qr" title="QR code" desc="Print-ready welcome QR." />
        <Tile href="/owner/bulletin" title="Bulletin board" desc="One announcement at a time." />
        <Tile href="/owner/meetups" title="Meetups" desc="Hosted events for guests." />
        <Tile href="/owner/analytics" title="Analytics" desc="Anonymous check-in stats." />
        <Tile href="/owner/billing" title="Billing" desc="Plan, next billing date, and Stripe portal." />
      </section>
    </div>
  )
}

function Tile({
  href,
  title,
  desc,
}: {
  href: string
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/5 bg-card p-4 hover:border-flame/40 hover:bg-card/80 transition-colors"
    >
      <p className="font-semibold text-cream">{title}</p>
      <p className="mt-0.5 text-xs text-mist">{desc}</p>
    </Link>
  )
}
