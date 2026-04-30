'use client'

import Link from 'next/link'
import { useEffect, useState, useActionState } from 'react'
import { signupAction, type SignupState } from '@/app/(auth)/signup/actions'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const initialState: SignupState = { error: null }

type CheckResult = 'available' | 'taken' | 'error'
type UsernameStatus = 'idle' | 'invalid' | 'checking' | CheckResult

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState)
  const [username, setUsername] = useState('')
  const [checked, setChecked] = useState<{ name: string; result: CheckResult } | null>(null)

  const status: UsernameStatus = !username
    ? 'idle'
    : !/^[a-zA-Z0-9_]{3,24}$/.test(username)
      ? 'invalid'
      : checked?.name === username
        ? checked.result
        : 'checking'

  useEffect(() => {
    if (!username) return
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return
    if (checked?.name === username) return

    let cancelled = false
    const timer = setTimeout(async () => {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('username_available', {
        _username: username,
      })
      if (cancelled) return
      setChecked({
        name: username,
        result: error ? 'error' : data ? 'available' : 'taken',
      })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [username, checked])

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Username" hint={<UsernameHint status={status} />}>
        <input
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          className={inputClass}
          placeholder="rolling_pines"
        />
      </Field>

      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </Field>

      <Field label="Password" hint="At least 8 characters">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>

      <label className="flex items-start gap-2 text-sm text-mist">
        <input
          type="checkbox"
          name="confirm_18"
          required
          className="mt-0.5 h-5 w-5 shrink-0 rounded border border-white/30 bg-white/5 accent-flame cursor-pointer"
        />
        <span>
          I confirm I am 18 years of age or older. RoadWave is not available
          to minors.
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm text-mist">
        <input
          type="checkbox"
          name="accept"
          required
          className="mt-0.5 h-5 w-5 shrink-0 rounded border border-white/30 bg-white/5 accent-flame cursor-pointer"
        />
        <span>
          I agree to the{' '}
          <Link href="/terms" target="_blank" className="text-flame underline-offset-2 hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" target="_blank" className="text-flame underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm text-mist">
        <input
          type="checkbox"
          name="accept_community_rules"
          required
          className="mt-0.5 h-5 w-5 shrink-0 rounded border border-white/30 bg-white/5 accent-flame cursor-pointer"
        />
        <span>
          I have read and agree to the{' '}
          <Link
            href="/community-rules"
            target="_blank"
            className="text-flame underline-offset-2 hover:underline"
          >
            RoadWave Community Rules
          </Link>
          .
        </span>
      </label>

      {state.error && <ErrorBanner>{state.error}</ErrorBanner>}

      <button
        type="submit"
        disabled={pending || status !== 'available'}
        className={primaryButtonClass}
      >
        {pending ? (
          'Creating account…'
        ) : (
          <>
            Create account <span aria-hidden>👋</span>
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-mist/80 leading-snug">
        RoadWave is not for emergencies, background checks, or campground
        security.
      </p>

      <p className="text-center text-sm text-mist">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-flame underline-offset-2 hover:underline">
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
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-cream">{label}</label>
      {children}
      {hint && <div className="mt-1 text-xs">{hint}</div>}
    </div>
  )
}

function UsernameHint({ status }: { status: UsernameStatus }) {
  switch (status) {
    case 'idle':
      return <span className="text-mist">3–24 letters, numbers, or underscores.</span>
    case 'invalid':
      return <span className="text-flame">3–24 letters, numbers, or underscores.</span>
    case 'checking':
      return <span className="text-mist">Checking availability…</span>
    case 'available':
      return <span className="text-leaf">Available.</span>
    case 'taken':
      return <span className="text-red-300">That username is taken.</span>
    case 'error':
      return <span className="text-red-300">Couldn&apos;t check right now.</span>
  }
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
      {children}
    </p>
  )
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'

const primaryButtonClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
