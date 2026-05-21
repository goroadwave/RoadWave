'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { loginAction, type LoginState } from '@/app/(auth)/login/actions'

const initialState: LoginState = { error: null }

type Props = {
  /** Intended post-auth destination forwarded by the /login page from
   *  its `?next=` query param. Embedded as a hidden form input so the
   *  loginAction can honor it after a successful sign-in. Null falls
   *  through to the role-based default in getPostAuthDestination. */
  next?: string | null
  /** Path to navigate to when the camper taps "Create an account".
   *  Falls back to /signup when no QR context needs forwarding. */
  signupHref?: string
}

export function LoginForm({ next = null, signupHref = '/signup' }: Props) {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="mb-1 block text-sm font-medium text-cream">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-cream">Password</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputCls}
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-flame underline-offset-2 hover:underline"
        >
          Forgot password?
        </Link>
      </p>

      <p className="text-center text-sm text-mist">
        New here?{' '}
        <Link href={signupHref} className="font-medium text-flame underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'

const primaryBtn =
  'w-full rounded-lg bg-flame text-night px-4 py-2.5 font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
