import Link from 'next/link'
import { ResendForm } from '@/components/auth/resend-form'
import { PageHeading } from '@/components/ui/page-heading'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const params = await searchParams
  const email = typeof params.email === 'string' ? params.email : undefined

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Almost there"
        title="Check your email"
        subtitle="We'll keep your details to yourself."
        compact
      />
      <p className="text-sm text-cream/85">
        {email ? (
          <>
            Verification link sent to <strong className="text-cream">{email}</strong>. Click
            it to finish setting up your account.
          </>
        ) : (
          <>Verification link sent. Click it to finish setting up your account.</>
        )}
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="mb-2 text-xs text-mist">Didn&apos;t get it? Resend below.</p>
        <ResendForm defaultEmail={email} />
      </div>

      <p className="text-sm text-mist">
        <Link href="/login" className="font-semibold text-flame underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
