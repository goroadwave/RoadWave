'use client'

import { useState, type FormEvent } from 'react'

// "Don't see your campground?" CTA box on the homepage. Posts to
// /api/campground-request which writes to the campground_requests table.
export function CampgroundRequestForm() {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const data = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/campground-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          campground_name: data.get('campground_name'),
        }),
      })
      if (res.ok) {
        setDone(true)
        return
      }
      if (res.status >= 400 && res.status < 500) {
        const message = (await res.text().catch(() => '')) || 'Please check your fields.'
        setError(message)
        return
      }
      // 5xx — soft-fail so a transient backend issue doesn't block the user.
      console.warn('campground request returned', res.status)
      setDone(true)
    } catch (err) {
      console.warn('campground request non-fatal:', err)
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-flame/60 bg-flame/[0.06] p-6 text-center space-y-2">
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <p className="font-display text-xl font-extrabold text-cream">
          Got it! We will get RoadWave to your campground.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-flame/50 bg-flame/[0.04] p-5 sm:p-6 space-y-4">
      <div className="text-center space-y-1">
        <h3 className="font-display text-2xl font-extrabold text-cream leading-tight">
          Don&apos;t see your campground?
        </h3>
        <p className="text-sm text-mist leading-snug">
          Request it and we will reach out to them directly. If enough RVers
          ask for the same spot we will prioritize it.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Your email"
          autoComplete="email"
          className={inputClass}
        />
        <input
          name="campground_name"
          required
          placeholder="Campground name"
          maxLength={200}
          className={inputClass}
        />

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-flame text-night px-4 py-3 font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Sending…' : 'Request This Campground'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'
