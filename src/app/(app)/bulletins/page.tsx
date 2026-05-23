import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Signed-in camper's bulletins surface. Shows the active campground's
// office bulletins (and any pinned critical weather/safety notice) so
// a camper who wants a focused view of "what has my campground said
// lately" has one. Mirrors the data the campground hub renders inside
// the Happening section, but lives on its own (app) route so it has a
// nav slot, a clean URL to share, and a fallback for the not-checked-in
// state.
//
// Bulletins are also surfaced in:
//   * The campground QR/hub page (HappeningSection)
//   * The Lantern (poll-driven badge + panel item)
// This page is the deep-link / overview alternative -- not a replacement
// for either of those.

export const dynamic = 'force-dynamic'

type BulletinRow = {
  id: string
  message: string
  category: 'event' | 'special' | 'alert' | 'general'
  is_critical: boolean
  created_at: string
  expires_at: string | null
}

export default async function BulletinsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Active check-in -- the source of "which campground's bulletins."
  // Same canonical filter shape /home and /meetups use.
  const { data: latestCheckIn } = await supabase
    .from('check_ins')
    .select('campground_id, expires_at')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestCheckIn) {
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow="Bulletins"
          title="Check in to see bulletins"
          subtitle="Office updates, weather notices, and other campground announcements show up here once you're checked in."
        />
        <Link
          href="/checkin"
          className="inline-flex items-center gap-2 rounded-lg bg-flame px-4 py-2 text-sm font-semibold text-night shadow-lg shadow-flame/10 hover:bg-amber-400"
        >
          Check in
          <span aria-hidden>👋</span>
        </Link>
      </div>
    )
  }

  // Self-mute parity with /meetups -- a camper with share_bulletins=false
  // (the campground_updates_only sub-toggle) sees a quiet placeholder
  // and a deep-link to flip it back on instead of the bulletin list.
  const { data: bulletinsPref } = await supabase
    .from('profiles')
    .select('share_bulletins')
    .eq('id', user!.id)
    .maybeSingle()
  if (bulletinsPref?.share_bulletins === false) {
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow="Bulletins"
          title="Bulletins muted"
          subtitle="You turned off campground bulletins."
        />
        <p className="rounded-2xl border border-white/10 bg-card/40 p-5 text-sm text-mist">
          To see office bulletins again, flip the toggle in{' '}
          <Link
            href="/settings/privacy"
            className="text-flame underline-offset-2 hover:underline"
          >
            Privacy settings
          </Link>
          .
        </p>
      </div>
    )
  }

  const campgroundId = latestCheckIn.campground_id

  const { data: campground } = await supabase
    .from('campgrounds')
    .select('name')
    .eq('id', campgroundId)
    .single()

  const nowIso = new Date().toISOString()
  const { data: bulletins } = await supabase
    .from('bulletins')
    .select('id, message, category, is_critical, created_at, expires_at')
    .eq('campground_id', campgroundId)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(30)
    .returns<BulletinRow[]>()

  const rows = bulletins ?? []
  const critical = rows.find((b) => b.is_critical) ?? null
  const regular = rows.filter((b) => !b.is_critical)

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Bulletins"
        title={`From ${campground?.name ?? 'your campground'}`}
        subtitle="Office updates, weather notices, and other campground announcements."
      />

      {critical && (
        <section
          aria-label="Critical notice"
          className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 sm:p-5 space-y-2"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-red-400/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
              Weather &amp; safety
            </span>
            <span className="text-[11px] text-red-200/80 tabular-nums">
              {formatDistanceToNow(new Date(critical.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm sm:text-base text-red-100 leading-relaxed whitespace-pre-wrap">
            {critical.message}
          </p>
        </section>
      )}

      {regular.length === 0 && !critical ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-5 text-center text-sm text-mist">
          No active bulletins. When the campground posts an update,
          you&apos;ll see it here.
        </p>
      ) : (
        <ul className="space-y-3">
          {regular.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-flame">
                  Office update
                </span>
                <span className="text-[11px] text-mist/70 tabular-nums">
                  {formatDistanceToNow(new Date(b.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-sm sm:text-base text-cream leading-relaxed whitespace-pre-wrap">
                {b.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
