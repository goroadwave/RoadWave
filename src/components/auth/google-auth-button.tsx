'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { recordOAuthConsentIntentAction } from '@/app/(auth)/signup/consent-intent-action'
import { recordOAuthCampgroundContextAction } from '@/app/(auth)/oauth-context-action'

// localStorage key used as a last-ditch recovery if BOTH the `next`
// query param and the server-side cookie are lost during the OAuth
// round-trip. Read by the /checkin fallback page when the camper
// somehow lands there with no campground context. Kept in sync with
// LOCAL_STORAGE_KEY in src/app/(app)/checkin/page.tsx — DO NOT rename
// without updating that consumer.
const OAUTH_CONTEXT_LOCAL_STORAGE_KEY = 'roadwave:oauth-campground-context'
const OAUTH_CONTEXT_TTL_MS = 15 * 60 * 1000

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
  /**
   * When set, the click handler will record an HTTP-only consent-intent
   * cookie before kicking off OAuth. /auth/callback uses that cookie to
   * write legal_acks and skip the duplicate /consent screen. This is
   * intentionally OPT-IN: only the signup page (where the three boxes
   * gate the button) sets this. The plain login page does not.
   */
  recordConsentBeforeOAuth?: boolean
  /**
   * Campground slug the camper came from (resolved by the auth page
   * via QrAuthContext). When present, the click handler writes a
   * short-TTL HttpOnly cookie AND a localStorage entry encoding the
   * slug + returnTo so /auth/callback (and the /checkin fallback)
   * can restore the destination even if the `next` query param is
   * dropped during the OAuth round-trip. See
   * src/lib/auth/oauth-context-cookie.ts for the why.
   */
  campgroundSlug?: string | null
  /**
   * Concrete returnTo URL to persist alongside campgroundSlug. Should
   * always start with /campground/<slug> — the cookie helper
   * validates this server-side too. When null/omitted, no campground
   * context is persisted (the plain `next` flow still applies).
   */
  returnTo?: string | null
}

export function GoogleAuthButton({
  next = '/',
  label = 'Continue with Google',
  disabled = false,
  recordConsentBeforeOAuth = false,
  campgroundSlug = null,
  returnTo = null,
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
    // If the signup page enabled the consent-intent path, write the
    // cookie before navigating to Google so /auth/callback can consume
    // it on return. Failure here is non-fatal — worst case the
    // /consent screen still shows post-OAuth.
    if (recordConsentBeforeOAuth) {
      try {
        await recordOAuthConsentIntentAction()
      } catch {
        // Swallow — fallback path is /consent.
      }
    }

    // Defense-in-depth for the campground OAuth handoff. Two writes:
    //   1. HttpOnly cookie via server action -- the /auth/callback
    //      route reads this server-side if `next` is missing or
    //      generic ("/", "/home"). Cookie is SameSite=Lax so it
    //      survives the Google -> Supabase -> us redirect chain.
    //   2. localStorage -- last-ditch recovery for the /checkin
    //      fallback page when the camper somehow lands there with
    //      no other context (e.g. the cookie got dropped). The
    //      fallback's mount-time effect redirects to the saved hub.
    // Both are intentionally non-blocking: if either write fails,
    // the plain `next` flow still works for the happy path.
    if (campgroundSlug && returnTo) {
      try {
        await recordOAuthCampgroundContextAction({
          slug: campgroundSlug,
          returnTo,
        })
      } catch {
        // Swallow -- the localStorage write + `next` query param
        // still cover the recovery paths.
      }
      try {
        window.localStorage.setItem(
          OAUTH_CONTEXT_LOCAL_STORAGE_KEY,
          JSON.stringify({
            slug: campgroundSlug,
            returnTo,
            ts: Date.now(),
            ttlMs: OAUTH_CONTEXT_TTL_MS,
          }),
        )
      } catch {
        // Safari private mode / storage quota; nothing we can do here.
      }
    }

    const supabase = createSupabaseBrowserClient()
    // Use the canonical site origin (NEXT_PUBLIC_SITE_URL) for the OAuth
    // redirectTo so Supabase honors it regardless of which host the camper
    // landed on. window.location.origin produces a Vercel branch URL like
    // road-wave.vercel.app on shared links; that host is not on the
    // Supabase Auth allow-list, so Supabase silently rewrites redirectTo
    // to the project Site URL and the camper ends up on the marketing
    // homepage with no `next` preserved. Inlined at build time by Next.
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      window.location.origin
    const redirectTo = `${siteOrigin}/auth/callback?next=${encodeURIComponent(next)}`
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
