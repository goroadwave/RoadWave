'use client'

import { useState } from 'react'
import {
  AuthDivider,
  GoogleAuthButton,
} from '@/components/auth/google-auth-button'
import { SignupForm } from '@/components/auth/signup-form'

// Wraps the /signup page's interactive elements so the Google button
// and the standard submit button share a single source of truth for
// the three required consent checkboxes:
//   • 18+ confirmation
//   • Terms / Privacy
//   • Community Rules
// Both buttons are non-clickable AND visually dulled until all three
// are checked. There is no path through this component that lets the
// Google button start an OAuth flow before consent is recorded.
//
// Phase E (2026-05-21) bug fix: the Google button used to hardcode
// `next="/"`, dropping the campground context that the /signup page
// just resolved via QrAuthContext. Camper would land on the
// marketing home → /home → eventually /checkin fallback ("You're
// not at a campground right now"). The page now passes its
// resolved nextHref + campgroundSlug + returnTo down so OAuth-based
// signups land back on the same campground hub as email signups.
type Props = {
  /** Resolved post-OAuth destination (campground hub URL when
   *  available, "/" otherwise). Forwarded to the Google button. */
  next?: string
  /** Campground slug from QrAuthContext, used by the Google button
   *  to persist the OAuth handoff cookie. Null when there's no
   *  campground context (plain /signup without QR params). */
  campgroundSlug?: string | null
  /** Concrete returnTo URL the OAuth callback should redirect to —
   *  same shape the cookie/localStorage recovery paths expect. */
  returnTo?: string | null
  /** Path to the /login page that preserves the same QR/next context.
   *  Forwarded to the "Already have an account?" link inside SignupForm
   *  so a returning camper keeps their intended destination. */
  loginHref?: string
}

export function SignupCard({
  next = '/',
  campgroundSlug = null,
  returnTo = null,
  loginHref = '/login',
}: Props = {}) {
  const [confirm18, setConfirm18] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptRules, setAcceptRules] = useState(false)
  const allChecked = confirm18 && acceptTerms && acceptRules

  return (
    <>
      <GoogleAuthButton
        next={next}
        label="Sign up with Google"
        disabled={!allChecked}
        recordConsentBeforeOAuth={allChecked}
        campgroundSlug={campgroundSlug}
        returnTo={returnTo}
      />
      {!allChecked && (
        <p className="text-center text-[11px] text-mist/70 leading-snug">
          Confirm 18+, agree to the Terms and Privacy Policy, and accept the
          Community Rules below to enable signup.
        </p>
      )}
      <AuthDivider />
      <SignupForm
        confirm18={confirm18}
        onConfirm18Change={setConfirm18}
        acceptTerms={acceptTerms}
        onAcceptTermsChange={setAcceptTerms}
        acceptRules={acceptRules}
        onAcceptRulesChange={setAcceptRules}
        next={next !== '/' ? next : null}
        loginHref={loginHref}
      />
    </>
  )
}
