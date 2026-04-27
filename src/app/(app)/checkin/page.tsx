import Link from 'next/link'
import { ActiveCheckIns } from '@/components/checkin/active-check-ins'
import { CheckInControls } from '@/components/checkin/check-in-controls'
import { ConfirmCheckIn } from '@/components/checkin/confirm-check-in'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/validators/checkin'

type Preview = {
  campground_id: string
  campground_name: string
  city: string | null
  region: string | null
} | null

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : null

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let preview: Preview = null
  let tokenError: string | null = null

  if (token) {
    if (!isUuid(token)) {
      tokenError = 'That link doesn’t look like a valid RoadWave check-in token.'
    } else {
      const { data, error } = await supabase.rpc('preview_campground_by_token', {
        _token: token,
      })
      if (error) {
        tokenError = 'We could not resolve that check-in link.'
      } else if (!data) {
        tokenError = 'No campground matches that token.'
      } else {
        preview = data as Preview
      }
    }
  }

  const { data: activeRows } = await supabase
    .from('check_ins')
    .select('id, campground_id, checked_in_at, expires_at')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('checked_in_at', { ascending: false })

  const cgIds = (activeRows ?? []).map((c) => c.campground_id)
  const { data: cgRows } =
    cgIds.length > 0
      ? await supabase
          .from('campgrounds')
          .select('id, name, city, region')
          .in('id', cgIds)
      : { data: [] as { id: string; name: string; city: string | null; region: string | null }[] }

  const cgMap = new Map((cgRows ?? []).map((c) => [c.id, c]))
  const activeCheckIns = (activeRows ?? []).map((c) => ({
    ...c,
    campground: cgMap.get(c.campground_id) ?? null,
  }))

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Check in"
        title="Where are you parked?"
        subtitle="24 hours, then you're invisible again."
      />

      {preview && token && <ConfirmCheckIn token={token} preview={preview} />}

      {tokenError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {tokenError}{' '}
          <Link href="/checkin" className="font-semibold text-flame underline">
            Try again
          </Link>
        </p>
      )}

      {!preview && <CheckInControls />}

      {activeCheckIns.length > 0 && <ActiveCheckIns checkIns={activeCheckIns} />}
    </div>
  )
}
