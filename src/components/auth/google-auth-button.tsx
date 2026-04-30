'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Props = {
  /** Where to send the user after the OAuth round-trip (default "/"). */
  next?: string
  /** Override the button copy if needed (default "Continue with Google"). */
  label?: string
  /**
   * Externally-driven disabled flag — used on the signup page to gate
   * the Google button on the three required consent checkboxes. When
   * true the button is non-clickable AND visually dulled, matching the
   * standard submit button's behavior.
   */
  disabled?: boolean
}

export function GoogleAuthButton({
  next = '/',
  label = 'Continue with Google',
  disabled = false,
}: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    // Defense-in-depth: never start the OAuth flow if the caller hasn't
    // satisfied its gating condition. The button is also visually
    // disabled below, but the explicit guard means a stray re-enable
    // can't slip a click through.
    if (disabled || pending) return
    setPending(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      setError(oauthError.message)
      setPending(false)
    }
    // Success path: Supabase navigates the window to Google — no client-side
    // state to clear here.
  }

  const isDisabled = disabled || pending

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className="w-full inline-flex items-center justify-center gap-3 rounded-lg border border-white/15 bg-white/95 px-4 py-2.5 text-sm font-semibold text-night shadow-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <GoogleG className="h-4 w-4" aria-hidden />
        <span>{pending ? 'Redirecting to Google…' : label}</span>
      </button>
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.61z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.19l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.69a5.41 5.41 0 0 1 0-3.38V4.98H.95a9 9 0 0 0 0 8.04l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.99 8.99 0 0 0 9 0 9 9 0 0 0 .95 4.98l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  )
}

export function AuthDivider({ children = 'or' }: { children?: string }) {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="flex-1 border-t border-white/10" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mist/70">
        {children}
      </span>
      <div className="flex-1 border-t border-white/10" />
    </div>
  )
}
