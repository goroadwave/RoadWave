import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  const params = await searchParams
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error
  const errorMessage = rawError ? friendlyError(rawError) : null

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Welcome back"
        title="Sign in"
        subtitle="Pick up where you parked."
        compact
      />

      {errorMessage && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 space-y-1">
          <p className="font-semibold">{errorMessage.title}</p>
          <p>{errorMessage.body}</p>
          {errorMessage.cta && (
            <p className="pt-1">
              <Link href={errorMessage.cta.href} className="font-semibold text-flame underline-offset-2 hover:underline">
                {errorMessage.cta.label}
              </Link>
            </p>
          )}
        </div>
      )}

      <LoginForm />
    </div>
  )
}

// Map raw error codes/messages from Supabase or our callback into something
// a human can act on.
function friendlyError(raw: string): {
  title: string
  body: string
  cta?: { label: string; href: string }
} {
  const lower = raw.toLowerCase()

  if (lower.includes('expired') || lower.includes('otp_expired')) {
    return {
      title: 'That confirmation link expired.',
      body: "Confirmation links are good for 24 hours. Sign in below — we'll send a fresh one.",
      cta: { label: 'Resend verification email', href: '/verify' },
    }
  }
  if (lower.includes('invalid') && lower.includes('flow')) {
    return {
      title: "We couldn't finish signing you in.",
      body: 'The verification link looks malformed. Try signing in below or request a new email.',
      cta: { label: 'Resend verification email', href: '/verify' },
    }
  }
  if (lower.includes('redirect') || lower.includes('url')) {
    return {
      title: 'Auth redirect URL mismatch.',
      body: 'The site was reached at a domain Supabase is not configured to allow. Check your Supabase Auth → URL Configuration.',
    }
  }
  if (lower === 'missing+verification+token' || lower.includes('missing')) {
    return {
      title: 'Verification token missing.',
      body: 'Open the link directly from your email. Some clients strip the token if you copy/paste.',
      cta: { label: 'Resend verification email', href: '/verify' },
    }
  }

  // Fallback: surface the raw message but framed for humans.
  return {
    title: "We couldn't verify your email.",
    body: raw,
    cta: { label: 'Resend verification email', href: '/verify' },
  }
}
