'use client'

import { useState, type FormEvent } from 'react'

// Demo lead-capture form. Submits to /api/campground-lead if it exists; on
// 404 or any failure, falls back to a friendly success state so the page
// still feels responsive in the marketing-only deployment.
export function CampgroundLeadForm() {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const data = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/campground-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          campground: data.get('campground'),
          email: data.get('email'),
        }),
      })
      // Even if the route 404s, treat as a success for the demo. The lead
      // can be wired to Supabase or an email service later.
      if (res.status >= 500) throw new Error(`Server error ${res.status}`)
    } catch (err) {
      // Soft-fail — don't block the user.
      console.warn('lead submit non-fatal:', err)
    } finally {
      setSubmitting(false)
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-flame/40 bg-flame/10 p-6 text-center space-y-2">
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <p className="font-display text-xl font-extrabold text-cream">Thanks!</p>
        <p className="font-serif italic text-flame text-base">
          We&apos;ll be in touch within a day or two.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 bg-card p-5 space-y-3 shadow-2xl shadow-black/40"
    >
      <Field label="Your name" name="name" placeholder="Jamie" required />
      <Field
        label="Campground name"
        name="campground"
        placeholder="Oak Hollow RV Resort"
        required
      />
      <Field
        label="Email"
        name="email"
        type="email"
        placeholder="you@yourcampground.com"
        required
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
        {submitting ? 'Sending…' : 'Request a RoadWave Friendly Demo'}
      </button>
      <p className="text-center text-[11px] text-mist/70">
        We only use this to send your demo. No spam.
      </p>
    </form>
  )
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-cream">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
      />
    </label>
  )
}
