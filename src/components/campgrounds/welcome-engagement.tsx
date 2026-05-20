'use client'

import { useState } from 'react'

// Guest Engagement Hub on the public campground welcome page. Four
// independently-toggleable surfaces — each rendered only when both the
// owner-set feature flag is on AND the owner has provided the data
// the surface needs (e.g. a review URL for the Review CTA).
//
//   1. Stay Feedback / Pulse Check — three-button row, with a
//      structured private follow-up form on "Something needs attention".
//   2. Review — link out to the configured Google review URL.
//   3. Book Again — link out with an optional custom message + promo
//      code; can also point at a phone/contact when no URL is set.
//   4. Contact the Office — categorized message form into the owner's
//      dashboard inbox (with optional email notification).
//
// All taps that aren't a navigation away fire to /api/campground/event
// via sendBeacon so they roll into the dashboard "This Week" card and
// the Monday report. Message submissions go through /api/campground/message.

// Nine guest-facing contact categories. Aligned with the spec ordered
// from "most actionable in the next hour" (wifi/maintenance/safety) to
// "soft signals" (compliment/suggestion). The DB column is plain
// text -- no CHECK constraint -- so older categories (laundry,
// propane, quiet_hours, local_recommendations, activities) are still
// accepted by the API route and still render correctly in the owner
// inbox label map; we just don't surface them in the dropdown.
//
// Safety concern gets the alert routing treatment downstream:
// red badge in /owner/messages and a [Safety] prefix on the
// owner-notification email subject.
const CONTACT_CATEGORIES: { value: string; label: string }[] = [
  { value: 'wifi', label: 'Wi-Fi issue' },
  { value: 'maintenance', label: 'Maintenance issue' },
  { value: 'noise', label: 'Noise concern' },
  { value: 'bathroom_laundry', label: 'Bathroom / laundry issue' },
  { value: 'late_checkout', label: 'Late checkout question' },
  { value: 'general_question', label: 'General question' },
  { value: 'compliment', label: 'Compliment' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'safety_concern', label: 'Safety concern' },
]

type Props = {
  campgroundId: string
  reviewUrl: string | null
  reviewEnabled: boolean
  bookingUrl: string | null
  bookingMessage: string | null
  bookingPromoCode: string | null
  bookingEnabled: boolean
  contactEnabled: boolean
  pulseEnabled: boolean
}

function logEvent(campgroundId: string, eventType: string) {
  const body = JSON.stringify({
    campground_id: campgroundId,
    event_type: eventType,
  })
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/campground/event', blob)
      return
    }
  } catch {
    // fall through to fetch
  }
  void fetch('/api/campground/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Logging is best-effort.
  })
}

export function WelcomeEngagement(props: Props) {
  const {
    campgroundId,
    reviewUrl,
    reviewEnabled,
    bookingUrl,
    bookingMessage,
    bookingPromoCode,
    bookingEnabled,
    contactEnabled,
    pulseEnabled,
  } = props

  // Each section can be hidden independently — if every section ends
  // up suppressed we render nothing and let the welcome page collapse
  // the gap.
  const showReview = reviewEnabled && !!reviewUrl
  const showBooking = bookingEnabled && !!bookingUrl
  const showContact = contactEnabled
  const showPulse = pulseEnabled

  if (!showReview && !showBooking && !showContact && !showPulse) return null

  return (
    <div className="space-y-8">
      {showPulse && <PulseCheck campgroundId={campgroundId} />}
      {(showReview || showBooking) && (
        <BookAndReview
          campgroundId={campgroundId}
          reviewUrl={showReview ? reviewUrl : null}
          bookingUrl={showBooking ? bookingUrl : null}
          bookingMessage={bookingMessage}
          bookingPromoCode={bookingPromoCode}
        />
      )}
      {showContact && <ContactOffice campgroundId={campgroundId} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pulse Check
// ---------------------------------------------------------------------------

type PulseStage = 'prompt' | 'thanks' | 'needs-form' | 'needs-sent'

function PulseCheck({ campgroundId }: { campgroundId: string }) {
  const [stage, setStage] = useState<PulseStage>('prompt')

  function chooseGood(eventType: 'pulse_great' | 'pulse_good') {
    logEvent(campgroundId, eventType)
    setStage('thanks')
  }

  function chooseNeedsAttention() {
    logEvent(campgroundId, 'pulse_needs_attention')
    setStage('needs-form')
  }

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        How&apos;s your stay so far?
      </h2>
      {stage === 'prompt' && (
        <div className="grid gap-2 sm:grid-cols-3">
          <PulseButton onClick={() => chooseGood('pulse_great')} emoji="🤩">
            Great
          </PulseButton>
          <PulseButton onClick={() => chooseGood('pulse_good')} emoji="🙂">
            Good
          </PulseButton>
          <PulseButton onClick={chooseNeedsAttention} emoji="🛠️">
            Something needs attention
          </PulseButton>
        </div>
      )}
      {stage === 'thanks' && (
        <div className="rounded-2xl border border-leaf/30 bg-leaf/[0.06] px-4 py-3 text-sm text-cream">
          Thanks for the heads up — the campground team will be glad to hear it.
        </div>
      )}
      {stage === 'needs-form' && (
        <NeedsAttentionForm
          campgroundId={campgroundId}
          onSent={() => setStage('needs-sent')}
        />
      )}
      {stage === 'needs-sent' && (
        <div className="rounded-2xl border border-flame/30 bg-flame/[0.06] px-4 py-3 text-sm text-cream">
          Sent to the campground office. Thanks for letting them know.
        </div>
      )}
    </section>
  )
}

function PulseButton({
  onClick,
  emoji,
  children,
}: {
  onClick: () => void
  emoji: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-card text-cream px-4 py-3.5 text-sm font-semibold hover:bg-white/[0.04] hover:border-flame/40 transition-colors"
    >
      <span aria-hidden>{emoji}</span> {children}
    </button>
  )
}

function NeedsAttentionForm({
  campgroundId,
  onSent,
}: {
  campgroundId: string
  onSent: () => void
}) {
  const [body, setBody] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const trimmed = body.trim()
    if (trimmed.length === 0) {
      setError('Tell the team what needs attention.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/campground/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campground_id: campgroundId,
          source: 'pulse_needs_attention',
          body: trimmed,
          guest_contact: contact.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Send failed (HTTP ${res.status})`)
      }
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-flame/30 bg-flame/[0.04] p-4">
      <p className="text-xs text-mist leading-snug">
        This goes privately to the campground office. Share what they should
        know — site number, location, anything urgent.
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="What needs attention?"
        className={textareaCls}
        required
      />
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        maxLength={200}
        placeholder="Optional: site #, name, or how to reach you"
        className={inputCls}
      />
      <p className="text-[11px] text-mist/80 leading-snug">
        For emergencies, call 911. For urgent campground issues, call the
        office directly.
      </p>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Sending…' : 'Send to office'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Review + Book Again
// ---------------------------------------------------------------------------

function BookAndReview({
  campgroundId,
  reviewUrl,
  bookingUrl,
  bookingMessage,
  bookingPromoCode,
}: {
  campgroundId: string
  reviewUrl: string | null
  bookingUrl: string | null
  bookingMessage: string | null
  bookingPromoCode: string | null
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        Loved your stay?
      </h2>
      {bookingUrl && (bookingMessage || bookingPromoCode) && (
        <div className="rounded-2xl border border-flame/30 bg-flame/[0.06] px-4 py-3 space-y-1.5">
          {bookingMessage && (
            <p className="text-sm text-cream leading-snug whitespace-pre-wrap">
              {bookingMessage}
            </p>
          )}
          {bookingPromoCode && (
            <p className="text-xs text-mist">
              Use code{' '}
              <span className="rounded bg-flame/15 text-flame px-1.5 py-0.5 font-mono font-semibold">
                {bookingPromoCode}
              </span>{' '}
              when you book.
            </p>
          )}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {bookingUrl && (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logEvent(campgroundId, 'book_again_click')}
            className={ctaCls}
          >
            <span aria-hidden>🛎️</span> Book Your Next Stay
          </a>
        )}
        {reviewUrl && (
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logEvent(campgroundId, 'review_click')}
            className={ctaCls}
          >
            <span aria-hidden>⭐</span> Leave a Google Review
          </a>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Contact the Office
// ---------------------------------------------------------------------------

function ContactOffice({ campgroundId }: { campgroundId: string }) {
  const [category, setCategory] = useState<string>('')
  const [body, setBody] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [startedLogged, setStartedLogged] = useState(false)

  // Fires once per ContactOffice mount the first time the camper
  // interacts with any field. Distinct from the contact_message
  // event that fires on submit — together they let the owner see
  // form-open vs form-submit conversion. Best-effort; failures are
  // swallowed by logEvent's beacon path.
  function markStarted() {
    if (startedLogged) return
    setStartedLogged(true)
    logEvent(campgroundId, 'office_contact_started')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!category) {
      setError('Pick a category first.')
      return
    }
    const trimmed = body.trim()
    if (trimmed.length === 0) {
      setError('Add a short message.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/campground/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campground_id: campgroundId,
          source: 'contact_form',
          category,
          body: trimmed,
          guest_contact: contact.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Send failed (HTTP ${res.status})`)
      }
      // Reset + show confirmation. We keep the section visible so the
      // guest can send another if needed.
      setBody('')
      setContact('')
      setCategory('')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        Contact the office
      </h2>
      <form
        onSubmit={submit}
        className="space-y-3 rounded-2xl border border-white/5 bg-card p-4"
      >
        <p className="text-xs text-mist leading-snug">
          For emergencies, call 911. For urgent campground issues, call the
          office directly.
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-cream">
            What&apos;s this about?
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onFocus={markStarted}
            className={selectCls}
            required
          >
            <option value="">Pick a category…</option>
            {CONTACT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-night text-cream">
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={markStarted}
          rows={4}
          maxLength={2000}
          placeholder="Your message…"
          className={textareaCls}
          required
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={200}
          placeholder="Optional: site #, name, or how to reach you"
          className={inputCls}
        />
        {error && <p className="text-xs text-red-300">{error}</p>}
        {sent && (
          <p className="text-xs text-leaf">Sent to the office. Thanks.</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Shared style tokens — kept inline so this single file stays standalone.
// ---------------------------------------------------------------------------

const ctaCls =
  'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-5 py-3 text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors'

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame disabled:opacity-50'

const textareaCls = inputCls + ' resize-none'

const selectCls = inputCls
