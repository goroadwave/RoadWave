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
    .select('privacy_mode, share_bulletins, share_meetups')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-xl space-y-7">
      <PageHeading
        eyebrow="Privacy mode"
        title="How visible are you?"
        subtitle="Four settings. You're always in control."
      />
      <PrivacyModeForm
        currentMode={(profile?.privacy_mode as PrivacyMode) ?? 'visible'}
        shareBulletins={profile?.share_bulletins ?? true}
        shareMeetups={profile?.share_meetups ?? true}
      />

      <section className="rounded-2xl border border-white/10 bg-card p-5 space-y-2">
        <h2 className="font-semibold text-cream">Delete your account</h2>
        <p className="text-sm text-mist leading-relaxed">
          To delete your RoadWave account and data, email{' '}
          <a
            href="mailto:hello@getroadwave.com"
            className="text-flame underline-offset-2 hover:underline"
          >
            hello@getroadwave.com
          </a>{' '}
          from the email address tied to your account and request deletion.
          We&apos;ll confirm the request and delete your account data within
          7 business days. If you&apos;re signed in, you can also delete
          your account immediately from inside the app using the{' '}
          <Link
            href="/account/delete"
            className="text-flame underline-offset-2 hover:underline"
          >
            account deletion page
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
