import { OwnerBulletinForm } from '@/components/owner/owner-bulletin-form'
import { Eyebrow } from '@/components/ui/eyebrow'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadOwnerCampground } from '../_helpers'
import { DeleteBulletinButton } from '@/components/owner/delete-bulletin-button'
import { EndCriticalNoticeButton } from '@/components/owner/end-critical-notice-button'

export default async function OwnerBulletinPage() {
  const { campground } = await loadOwnerCampground()
  if (!campground) {
    return (
      <PageHeading
        eyebrow="Bulletin"
        title="No campground linked"
        subtitle="Refresh, or contact support if this persists."
      />
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data: active } = await supabase
    .from('bulletins')
    .select('id, message, category, expires_at, created_at, is_critical')
    .eq('campground_id', campground.id)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Bulletin board"
        title="Tell guests what's happening"
        subtitle="One bulletin at a time. Posting a new one replaces the old."
      />

      {active && (
        <section className="space-y-2">
          <Eyebrow>Currently posted</Eyebrow>
          <div
            className={
              active.is_critical
                ? 'rounded-2xl border border-red-500/40 bg-red-500/[0.06] p-4 space-y-2'
                : 'rounded-2xl border border-flame/40 bg-flame/[0.06] p-4 space-y-2'
            }
          >
            <div className="flex items-start gap-2 flex-wrap">
              {active.is_critical && (
                <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-200">
                  ⚠ Critical
                </span>
              )}
              <span className="rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-flame">
                {active.category}
              </span>
              <p className="flex-1 text-sm text-cream leading-snug min-w-0">
                {active.message}
              </p>
            </div>
            <p className="text-[11px] text-mist">
              Posted {new Date(active.created_at).toLocaleString()}
              {active.expires_at && (
                <>
                  {' '}
                  · Expires {new Date(active.expires_at).toLocaleString()}
                </>
              )}
            </p>
            {/* Phase 3c -- "End critical notice" appears only when the
                active bulletin is_critical. Stops the prominent
                top-of-page red banner + Lantern badge for campers
                while keeping the announcement available in the
                normal bulletins list. "Delete bulletin" still
                removes the whole row. */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {active.is_critical && (
                <EndCriticalNoticeButton bulletinId={active.id} />
              )}
              <DeleteBulletinButton bulletinId={active.id} />
            </div>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <Eyebrow>{active ? 'Replace bulletin' : 'Post bulletin'}</Eyebrow>
        <OwnerBulletinForm campgroundId={campground.id} />
      </section>
    </div>
  )
}
