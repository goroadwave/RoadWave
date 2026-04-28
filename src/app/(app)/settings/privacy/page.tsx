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
    </div>
  )
}
