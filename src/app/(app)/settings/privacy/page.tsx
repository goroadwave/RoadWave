import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PrivacyModeForm } from '@/components/privacy/privacy-mode-form'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { PrivacyMode } from '@/lib/types/db'

export default async function PrivacyPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('privacy_mode')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-xl space-y-7">
      <PageHeading
        eyebrow="Privacy mode"
        title="How visible are you?"
        subtitle="Three settings. You're always in control."
      />
      <PrivacyModeForm
        currentMode={(profile?.privacy_mode as PrivacyMode) ?? 'visible'}
      />

      <section className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-5 space-y-2">
        <h2 className="font-semibold text-cream">Danger zone</h2>
        <p className="text-sm text-mist leading-relaxed">
          Permanently delete your RoadWave account and every piece of data
          tied to it — profile, check-ins, waves, crossed paths, and messages.
          This can&apos;t be undone.
        </p>
        <Link
          href="/settings/delete-account"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-2 text-sm font-semibold hover:bg-red-500/20 transition-colors"
        >
          Delete my account
        </Link>
      </section>
    </div>
  )
}
