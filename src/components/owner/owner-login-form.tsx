'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { ownerLoginAction, type OwnerLoginState } from '@/app/owner/login/actions'

const initialState: OwnerLoginState = { error: null }

export function OwnerLoginForm() {
  const [state, formAction, pending] = useActionState(
    ownerLoginAction,
    initialState,
  )
  return (
    <form action={formAction} className="space-y-4">
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
        <Link
          href="/owner/signup"
          className="font-semibold text-flame underline-offset-2 hover:underline"
        >
          Set up your campground
        </Link>
      </p>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'

const primaryBtn =
  'w-full rounded-lg bg-flame text-night px-4 py-2.5 font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
