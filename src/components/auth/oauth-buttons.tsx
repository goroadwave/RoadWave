'use client'

// Google + Apple SSO buttons. Calls supabase.auth.signInWithOAuth which
// redirects to the provider, then back through /auth/callback (which
// exchanges the code for a session and forwards to the homepage).
//
// IMPORTANT: Both providers must be enabled in the Supabase dashboard
// under Authentication → Providers. Without that, signInWithOAuth will
// return an error and the user will see "Provider not enabled."
//   - Google: enable, paste OAuth client id + secret from Google Cloud
//     Console (Authorized redirect URI: <project>.supabase.co/auth/v1/callback).
//   - Apple: enable, paste Services ID + key id + team id + private key
//     from Apple Developer (Return URL: same Supabase callback URL).
// Until both are enabled in Supabase, these buttons will fail at runtime.

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Provider = 'google' | 'apple'

export function OAuthButtons() {
  const [pending, setPending] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(provider: Provider) {
    setError(null)
    setPending(provider)
    const supabase = createSupabaseBrowserClient()
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // After the provider redirects back to Supabase, Supabase redirects
        // here with a ?code=... that /auth/callback exchanges for a session.
        redirectTo: `${siteUrl}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setPending(null)
    }
    // On success the browser is redirected away — no further state to set.
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => signIn('google')}
        disabled={pending !== null}
        className={btn}
      >
        <GoogleLogo className="h-4 w-4" />
        {pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <button
        type="button"
        onClick={() => signIn('apple')}
        disabled={pending !== null}
        className={btn}
      >
        <AppleLogo className="h-4 w-4" />
        {pending === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
      </button>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <span className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-mist">
          or continue with email
        </span>
        <span className="flex-1 h-px bg-white/10" />
      </div>
    </div>
  )
}

const btn =
  'w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#FFC107" d="M21.8 12.2c0-.66-.06-1.3-.17-1.91H12v3.62h5.51a4.7 4.7 0 0 1-2.04 3.08v2.55h3.3c1.93-1.78 3.04-4.4 3.04-7.34Z" />
      <path fill="#FF3D00" d="M12 22c2.76 0 5.07-.92 6.76-2.46l-3.3-2.55c-.92.62-2.1.99-3.46.99-2.66 0-4.92-1.8-5.72-4.21H2.86v2.65A10 10 0 0 0 12 22Z" />
      <path fill="#4CAF50" d="M6.28 13.77a6 6 0 0 1 0-3.54V7.58H2.86a10 10 0 0 0 0 8.84l3.42-2.65Z" />
      <path fill="#1976D2" d="M12 5.95c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.07 2.92 14.76 2 12 2A10 10 0 0 0 2.86 7.58l3.42 2.65C7.08 7.75 9.34 5.95 12 5.95Z" />
    </svg>
  )
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.36 12.49c.02 2.7 2.36 3.6 2.39 3.61-.02.07-.37 1.27-1.22 2.5-.74 1.07-1.5 2.13-2.7 2.16-1.18.02-1.55-.7-2.9-.7-1.34 0-1.76.68-2.87.72-1.16.04-2.04-1.16-2.78-2.22-1.51-2.18-2.66-6.16-1.11-8.86.77-1.34 2.14-2.18 3.62-2.2 1.13-.02 2.2.76 2.9.76.69 0 1.99-.94 3.36-.8.57.02 2.18.23 3.21 1.74-.08.05-1.92 1.12-1.9 3.34Zm-2.2-6.51c.62-.75 1.04-1.8.92-2.84-.9.04-1.98.6-2.62 1.34-.58.66-1.08 1.72-.94 2.74 1 .08 2.02-.51 2.64-1.24Z" />
    </svg>
  )
}
