'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    if (!email) {
      setError('Enter the email tied to your account.')
      setSubmitting(false)
      return
    }
    const supabase = createSupabaseBrowserClient()
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-flame/40 bg-flame/10 p-5 space-y-2 text-center">
        <p className="text-3xl" aria-hidden>
          📬
        </p>
        <p className="font-display text-xl font-extrabold text-cream">
          Check your inbox
        </p>
        <p className="text-sm text-mist leading-snug">
          If we have an account for that email, a reset link is on the way.
          The link expires in an hour.
        </p>
        <p className="pt-3 text-sm">
          <Link
            href="/login"
            className="font-medium text-flame underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className={primaryBtn}>
        {submitting ? 'Sending…' : 'Send Reset Link'}
      </button>

      <p className="text-center text-sm text-mist">
        Remembered it?{' '}
        <Link
          href="/login"
          className="font-medium text-flame underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'

const primaryBtn =
  'w-full rounded-lg bg-flame text-night px-4 py-2.5 font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
