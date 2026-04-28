'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type ExchangeStatus = 'pending' | 'ready' | 'invalid'

export function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<ExchangeStatus>('pending')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Supabase sends the user here with a ?code=... PKCE code. We exchange it
  // for a temporary session that lets us call updateUser({ password }).
  // If there's no code, the user got here some other way — we still let
  // them try, in case they already have a session (e.g., they hit "change
  // password" while signed in).
  useEffect(() => {
    const code = params?.get('code') ?? null
    const supabase = createSupabaseBrowserClient()

    async function run() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus('invalid')
          return
        }
        setStatus('ready')
        return
      }
      // No code — see if there's already an active session.
      const { data } = await supabase.auth.getSession()
      setStatus(data.session ? 'ready' : 'invalid')
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once
  }, [])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const data = new FormData(e.currentTarget)
    const password = String(data.get('password') ?? '')
    const confirm = String(data.get('confirm') ?? '')

    if (password.length < 8) {
      setError('Pick a password with at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("Those don't match. Try again.")
      return
    }

    setSubmitting(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
    setTimeout(() => router.replace('/home'), 1500)
  }

  if (status === 'pending') {
    return (
      <div className="text-center text-sm text-mist py-4">
        Verifying your reset link…
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="space-y-3 text-center">
        <h1 className="font-display text-2xl font-extrabold text-cream">
          That link expired.
        </h1>
        <p className="text-sm text-mist leading-snug">
          Reset links are good for one hour and one use. Request a fresh one
          and try again.
        </p>
        <p className="pt-2">
          <Link
            href="/forgot-password"
            className="font-semibold text-flame underline-offset-2 hover:underline"
          >
            Send a new reset link →
          </Link>
        </p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-leaf/40 bg-leaf/10 p-5 space-y-2 text-center">
        <p className="text-3xl" aria-hidden>
          ✅
        </p>
        <p className="font-display text-xl font-extrabold text-cream">
          Password updated
        </p>
        <p className="text-sm text-mist">Taking you home…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl font-extrabold text-cream">
          Set a new password.
        </h1>
        <p className="text-sm text-mist">
          Pick something at least 8 characters long.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-cream">
            New password
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-cream">
            Confirm password
          </label>
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </div>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className={primaryBtn}>
          {submitting ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'

const primaryBtn =
  'w-full rounded-lg bg-flame text-night px-4 py-2.5 font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
