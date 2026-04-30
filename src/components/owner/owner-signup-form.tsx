'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import {
  ownerSignupAction,
  type OwnerSignupState,
} from '@/app/owner/signup/actions'

const initialState: OwnerSignupState = { error: null }

export function OwnerSignupForm() {
  const [state, formAction, pending] = useActionState(
    ownerSignupAction,
    initialState,
  )
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Your name">
        <input name="display_name" required className={inputCls} placeholder="Jamie" />
      </Field>
      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputCls}
        />
      </Field>
      <Field label="Password" hint="At least 8 characters">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
      </Field>
      <Field label="Campground name">
        <input
          name="campground_name"
          required
          className={inputCls}
          placeholder="Oak Hollow RV Resort"
        />
      </Field>

      <Field label="Phone number" hint="Optional.">
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          maxLength={60}
          className={inputCls}
          placeholder="(407) 555-0100"
        />
      </Field>

      <label className="flex items-start gap-2 text-sm text-mist">
        <input
          type="checkbox"
          name="confirm_18_and_authorized"
          required
          className="mt-0.5 h-5 w-5 shrink-0 rounded border border-white/30 bg-white/5 accent-flame cursor-pointer"
        />
        <span>
          I confirm I am 18 years of age or older and authorized to represent
          my campground or RV park.
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm text-mist">
        <input
          type="checkbox"
          name="accept_partner_terms"
          required
          className="mt-0.5 h-5 w-5 shrink-0 rounded border border-white/30 bg-white/5 accent-flame cursor-pointer"
        />
        <span>
          I have read and agree to the{' '}
          <Link
            href="/campground-partner-terms"
            target="_blank"
            className="text-flame underline-offset-2 hover:underline"
          >
            RoadWave Partner Terms and Conduct Restrictions
          </Link>
          .
        </span>
      </label>
      <p className="text-xs text-mist/80">
        By creating an account you also agree to the{' '}
        <Link href="/terms" target="_blank" className="text-flame underline-offset-2 hover:underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" target="_blank" className="text-flame underline-offset-2 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? 'Creating…' : 'Create campground account'}
      </button>

      <p className="text-center text-sm text-mist">
        Already set up?{' '}
        <Link
          href="/owner/login"
          className="font-semibold text-flame underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-cream">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-mist">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'

const primaryBtn =
  'w-full rounded-lg bg-flame text-night px-4 py-2.5 font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
