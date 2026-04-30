import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { IncomingWaveCard } from '@/components/waves/incoming-wave-card'
import { SafetyBanner } from '@/components/ui/safety-banner'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

const SAFETY_COPY =
  'Safety reminder: Meet in public campground areas, trust your instincts, and do not share your exact site number unless you choose to.'

export default async function IncomingWavePage({ params }: Props) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type IncomingWave = {
    wave_id: string
    sender_id: string
    campground_id: string
    rig_type: string | null
    interests: string[] | null
    status: string
  }
  const { data: summary } = await supabase
    .rpc('incoming_wave', { _wave_id: id })
    .maybeSingle<IncomingWave>()
  if (!summary) notFound()

  const status = summary.status ?? 'pending'
  if (status === 'declined' || status === 'connected') {
    return (
      <div className="space-y-4">
        <SafetyBanner message={SAFETY_COPY} />
        <section className="rounded-2xl border border-white/5 bg-card p-5 space-y-2">
          <h1 className="font-display text-xl font-extrabold text-cream leading-tight">
            {status === 'declined'
              ? 'You already dismissed this wave.'
              : 'You’re already connected.'}
          </h1>
          <Link
            href="/home"
            className="text-xs text-flame underline-offset-2 hover:underline"
          >
            ← Back home
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SafetyBanner message={SAFETY_COPY} />
      <IncomingWaveCard
        waveId={id}
        senderId={summary.sender_id}
        campgroundId={summary.campground_id}
        rigType={summary.rig_type}
        interests={summary.interests ?? []}
      />
    </div>
  )
}
