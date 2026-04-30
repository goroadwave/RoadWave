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
export function SignupCard() {
  const [confirm18, setConfirm18] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptRules, setAcceptRules] = useState(false)
  const allChecked = confirm18 && acceptTerms && acceptRules

  return (
    <>
      <GoogleAuthButton
        next="/"
        label="Sign up with Google"
        disabled={!allChecked}
        recordConsentBeforeOAuth={allChecked}
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
      />
    </>
  )
}
