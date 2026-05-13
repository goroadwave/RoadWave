import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { AuthDivider, GoogleAuthButton } from '@/components/auth/google-auth-button'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Same campground-aware shape as /signup: if the caller arrived with
// ?next=/checkin?token=<uuid>, resolve the campground from the token
// and surface a campground-specific header instead of the generic
// "Welcome back / Sign in" copy.
const CHECKIN_NEXT_RE = /^\/checkin\?token=([0-9a-f-]{36})$/i
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveCheckInTarget(
  next: string | undefined,
): Promise<{ name: string; city: string | null; region: string | null } | null> {
  if (!next) return null
  const decoded = next.startsWith('%2F') ? decodeURIComponent(next) : next
  const match = decoded.match(CHECKIN_NEXT_RE)
  if (!match) return null
  const token = match[1]
  if (!UUID_RE.test(token)) return null
  try {
    const admin = createSupabaseAdminClient()
    const { data: tokenRow } = await admin
      .from('campground_qr_tokens')
      .select('campground_id')
      .eq('token', token)
      .maybeSingle<{ campground_id: string }>()
    if (!tokenRow?.campground_id) return null
    const { data: cg } = await admin
      .from('campgrounds')
      .select('name, city, region, is_active')
      .eq('id', tokenRow.campground_id)
      .maybeSingle<{
        name: string
        city: string | null
        region: string | null
        is_active: boolean
      }>()
    if (!cg || !cg.is_active) return null
    return { name: cg.name, city: cg.city, region: cg.region }
  } catch {
    return null
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; next?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  const params = await searchParams
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error
  const errorMessage = rawError ? friendlyError(rawError) : null
  const target = await resolveCheckInTarget(params.next)

  return (
    <div className="space-y-6">
      {target ? (
        <>
          <PageHeading
            eyebrow={`Check in to ${target.name}`}
            title="Sign in to finish checking in"
            subtitle={
              [target.city, target.region].filter(Boolean).join(', ') ||
              target.name
            }
            compact
          />
          <p className="rounded-xl border border-leaf/30 bg-leaf/[0.06] px-4 py-3 text-sm text-cream/90 leading-relaxed">
            Sign in below and you&apos;ll go straight to the check-in screen
            for <strong className="text-cream">{target.name}</strong>.
          </p>
        </>
      ) : (
        <PageHeading
          eyebrow="Welcome back"
          title="Sign in"
          subtitle="Pick up where you parked."
          compact
        />
      )}

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

      <GoogleAuthButton next="/" />
      <AuthDivider />
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
  // Match only the specific "missing verification token" error our auth
  // routes emit (raw + URL-encoded form). The previous broad
  // `lower.includes('missing')` was catching unrelated Supabase errors
  // and showing a misleading "token missing" banner on the login page
  // in cases that had nothing to do with verification.
  if (
    lower === 'missing verification token' ||
    lower === 'missing+verification+token'
  ) {
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
