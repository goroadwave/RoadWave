'use client'

import { useState } from 'react'
import { appendCamperMessage } from '@/components/campgrounds/camper-message-storage'
import { CamperMessageTracker } from '@/components/campgrounds/camper-message-tracker'

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
  /** Campground slug (e.g. "happy-trails-rv"). Stored in localStorage
   *  alongside each office message so the /m/[id] thread page can show
   *  a "Back to campground page" link that resolves to /campground/<slug>.
   *  Optional so this component still mounts on demo pages without a
   *  real slug. */
  campgroundSlug?: string | null
  reviewUrl: string | null
  /** Facebook CTA fields (mig 0057). All three together drive the
   *  optional Recommend Us on Facebook button inside the new "Support
   *  This Campground" section. Button only renders when
   *  facebookEnabled is true AND facebookUrl is non-null;
   *  facebookButtonLabel is the owner-customizable CTA text (falls
   *  back to "Recommend Us on Facebook" when null). */
  facebookUrl?: string | null
  facebookButtonLabel?: string | null
  facebookEnabled?: boolean
  reviewEnabled: boolean
  bookingUrl: string | null
  bookingMessage: string | null
  bookingPromoCode: string | null
  bookingEnabled: boolean
  contactEnabled: boolean
  pulseEnabled: boolean
  /** Preview mode (owner /owner/preview). When true:
   *   - logEvent calls no-op (no stat rows polluted by owner clicks).
   *   - Form submissions are blocked client-side and show a small
   *     "Preview — submission disabled" badge instead of posting.
   *   - Outbound CTA links (Book Again, Review) still navigate so the
   *     owner can verify the URL is correct.
   *  Defaults to false (live guest behavior). */
  previewMode?: boolean
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
    campgroundSlug = null,
    reviewUrl,
    reviewEnabled,
    facebookUrl = null,
    facebookButtonLabel = null,
    facebookEnabled = false,
    bookingUrl,
    bookingMessage,
    bookingPromoCode,
    bookingEnabled,
    contactEnabled,
    pulseEnabled,
    previewMode = false,
  } = props

  // Each section can be hidden independently — if every section ends
  // up suppressed we render nothing and let the welcome page collapse
  // the gap.
  const showReview = reviewEnabled && !!reviewUrl
  const showFacebook = facebookEnabled && !!facebookUrl
  const showBooking = bookingEnabled && !!bookingUrl
  const showContact = contactEnabled
  const showPulse = pulseEnabled
  // "Support This Campground" renders if any of its three CTAs are
  // configured. Each button is independently gated below; the section
  // wrapper just decides whether the headline appears.
  const showSupport = showReview || showFacebook || showBooking

  // The tracker reads localStorage and only renders if the camper
  // has existing office messages for this campground. Even when every
  // other surface is off, we want the tracker to keep showing so a
  // returning camper can still find their thread.
  const trackerNode = (
    <CamperMessageTracker
      campgroundId={campgroundId}
      previewMode={previewMode}
    />
  )

  if (!showReview && !showFacebook && !showBooking && !showContact && !showPulse) {
    return <div className="space-y-8">{trackerNode}</div>
  }

  return (
    <div className="space-y-8">
      {trackerNode}
      {showPulse && (
        <PulseCheck campgroundId={campgroundId} previewMode={previewMode} />
      )}
      {showSupport && (
        <SupportThisCampground
          campgroundId={campgroundId}
          reviewUrl={showReview ? reviewUrl : null}
          facebookUrl={showFacebook ? facebookUrl : null}
          facebookButtonLabel={facebookButtonLabel}
          bookingUrl={showBooking ? bookingUrl : null}
          bookingMessage={bookingMessage}
          bookingPromoCode={bookingPromoCode}
          previewMode={previewMode}
        />
      )}
      {showContact && (
        <ContactOffice
          campgroundId={campgroundId}
          campgroundSlug={campgroundSlug}
          previewMode={previewMode}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pulse Check
// ---------------------------------------------------------------------------

type PulseStage = 'prompt' | 'thanks' | 'needs-form' | 'needs-sent'

function PulseCheck({
  campgroundId,
  previewMode,
}: {
  campgroundId: string
  previewMode: boolean
}) {
  const [stage, setStage] = useState<PulseStage>('prompt')

  function chooseGood(eventType: 'pulse_great' | 'pulse_good') {
    if (!previewMode) logEvent(campgroundId, eventType)
    setStage('thanks')
  }

  function chooseNeedsAttention() {
    if (!previewMode) logEvent(campgroundId, 'pulse_needs_attention')
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
          previewMode={previewMode}
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
  previewMode,
}: {
  campgroundId: string
  onSent: () => void
  previewMode: boolean
}) {
  const [body, setBody] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (previewMode) {
      setError('Preview mode — submission disabled.')
      return
    }
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
// Support This Campground -- Google Review + Facebook + Book Again
// ---------------------------------------------------------------------------
// Single grouped section so the three "support the campground" CTAs
// live together with one shared headline. Each button is independently
// gated by the (flag && url) parent rule, so missing data hides only
// that button -- the section stays as long as at least one is set.
// Order: Google Review -> Facebook -> Book Again. This matches the
// spec's "Google first, Facebook second, booking after" ordering.

function SupportThisCampground({
  campgroundId,
  reviewUrl,
  facebookUrl,
  facebookButtonLabel,
  bookingUrl,
  bookingMessage,
  bookingPromoCode,
  previewMode,
}: {
  campgroundId: string
  reviewUrl: string | null
  facebookUrl: string | null
  facebookButtonLabel: string | null
  bookingUrl: string | null
  bookingMessage: string | null
  bookingPromoCode: string | null
  previewMode: boolean
}) {
  // Default Facebook label when the owner left the custom label blank.
  // Mirrors the spec's preferred default copy.
  const facebookLabel =
    facebookButtonLabel && facebookButtonLabel.trim().length > 0
      ? facebookButtonLabel
      : 'Recommend Us on Facebook'

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        Support this campground
      </h2>
      <p className="text-xs text-mist leading-snug">
        Enjoying your stay? Your feedback helps this campground grow.
      </p>
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
        {reviewUrl && (
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={
              previewMode
                ? undefined
                : () => logEvent(campgroundId, 'review_click')
            }
            className={ctaCls}
          >
            <span aria-hidden>⭐</span> Leave a Google Review
          </a>
        )}
        {facebookUrl && (
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaCls}
          >
            {/* No click event logged yet -- the campground_events
                CHECK constraint (last extended in mig 0044) doesn't
                include 'facebook_click'. We'll fold that into the
                Phase 4 event-types migration so the dashboard can
                count Facebook taps alongside Google + Book Again. */}
            <span aria-hidden>👍</span> {facebookLabel}
          </a>
        )}
        {bookingUrl && (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={
              previewMode
                ? undefined
                : () => logEvent(campgroundId, 'book_again_click')
            }
            className={ctaCls}
          >
            <span aria-hidden>🛎️</span> Book Your Next Stay
          </a>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Contact the Office
// ---------------------------------------------------------------------------

// Allowed values for preferred_contact_method. Mirrors mig 0052's
// CHECK constraint + the API's allow-list. Radio order: most-common
// first ("Email me back" tends to dominate).
type PreferredContactMethod = 'email' | 'phone' | 'text' | 'no_reply'

function ContactOffice({
  campgroundId,
  campgroundSlug,
  previewMode,
}: {
  campgroundId: string
  campgroundSlug: string | null
  previewMode: boolean
}) {
  // Structured guest-info fields persisted to public.campground_messages
  // (mig 0052). All five contact pointers are owner-only PII; the
  // server-side API enforces required/conditional rules in parallel
  // with this client-side validation.
  const [siteNumber, setSiteNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [preferredMethod, setPreferredMethod] =
    useState<PreferredContactMethod | ''>('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState<string>('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [startedLogged, setStartedLogged] = useState(false)
  // After a successful submit we DON'T render a full inline "Check
  // replies" card -- that duplicated the persistent "Your messages
  // with the office" tracker rendered above. We just show a short
  // confirmation line and let the tracker (which received the same
  // entry via appendCamperMessage) be the single source of truth
  // for the camper's office threads on this device.

  // Fires once per ContactOffice mount the first time the camper
  // interacts with any field. Distinct from the contact_message
  // event that fires on submit — together they let the owner see
  // form-open vs form-submit conversion. Best-effort; failures are
  // swallowed by logEvent's beacon path.
  function markStarted() {
    if (startedLogged) return
    setStartedLogged(true)
    if (!previewMode) logEvent(campgroundId, 'office_contact_started')
  }

  // Conditional UX: only show the phone input when the chosen method
  // needs it (phone / text). Only show the email input when the
  // method needs it (email). no_reply hides both. Keeping the fields
  // collapsed when not needed reduces visible noise and reinforces
  // "the office only sees what you give them."
  const needsPhone = preferredMethod === 'phone' || preferredMethod === 'text'
  const needsEmail = preferredMethod === 'email'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (previewMode) {
      setError('Preview mode — submission disabled.')
      return
    }
    const trimmedSite = siteNumber.trim()
    const trimmedLast = lastName.trim()
    const trimmedFirst = firstName.trim()
    const trimmedPhone = phone.trim()
    const trimmedEmail = email.trim()
    const trimmedBody = body.trim()

    if (!trimmedSite) {
      setError('Site number is required.')
      return
    }
    if (!trimmedLast) {
      setError('Last name is required.')
      return
    }
    if (!preferredMethod) {
      setError('Pick a preferred contact method.')
      return
    }
    if (needsPhone && !trimmedPhone) {
      setError('Phone number is required for your chosen contact method.')
      return
    }
    if (needsEmail && !trimmedEmail) {
      setError('Email is required for your chosen contact method.')
      return
    }
    if (!category) {
      setError('Pick a category.')
      return
    }
    if (!trimmedBody) {
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
          body: trimmedBody,
          site_number: trimmedSite,
          first_name: trimmedFirst || undefined,
          last_name: trimmedLast,
          phone: trimmedPhone || undefined,
          email: trimmedEmail || undefined,
          preferred_contact_method: preferredMethod,
        }),
      })
      if (!res.ok) {
        // The API returns { ok: false, error: "..." } JSON; surface that.
        let serverError = `Send failed (HTTP ${res.status})`
        try {
          const j = await res.json()
          if (j && typeof j.error === 'string') serverError = j.error
        } catch {
          // Non-JSON response; keep the generic message.
        }
        throw new Error(serverError)
      }
      // Read the message id + guest_reply_token from the response so we
      // can render the secure "Check replies" link. Both are server-
      // minted; failure to parse them just means the confirmation block
      // skips the link (the office can still email the same link if
      // the guest provided email).
      let replyId: string | null = null
      let replyToken: string | null = null
      try {
        const j = await res.json()
        if (j && typeof j.id === 'string') replyId = j.id
        if (j && typeof j.guest_reply_token === 'string') {
          replyToken = j.guest_reply_token
        }
      } catch {
        // Body not JSON -- skip the link, still show the basic "Sent" UI.
      }
      if (replyId && replyToken) {
        // Persist to localStorage so the CamperMessageTracker can
        // restore the "Check replies" card after reload. Scoped per
        // campground; entries from other campgrounds aren't touched.
        // The tracker is the single rendering surface for the
        // camper's threads -- the inline form just flips to a short
        // "Sent" line below.
        appendCamperMessage(campgroundId, {
          id: replyId,
          token: replyToken,
          siteNumber: trimmedSite,
          lastName: trimmedLast,
          category,
          submittedAt: new Date().toISOString(),
          lastSeenReplyAt: null,
          campgroundSlug,
        })
      }
      // Reset + show confirmation. We keep the section visible so the
      // guest can send another if needed.
      setSiteNumber('')
      setFirstName('')
      setLastName('')
      setPhone('')
      setEmail('')
      setPreferredMethod('')
      setCategory('')
      setBody('')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.')
    } finally {
      setSubmitting(false)
    }
  }

  // Once a message has been submitted, the persistent tracker card
  // above ("Your messages with the office") is the sole UI for the
  // just-sent thread. We collapse this whole section to ONE tiny
  // underline link so there's nothing here that could read as a
  // second card -- no eyebrow heading, no green check, no
  // confirmation paragraph, no border, no background. Click the
  // link to open a fresh form for another submission.
  if (sent) {
    // Anchor target still attached so the Quick Actions "Contact
    // office" button doesn't scroll past nothing after a successful
    // submit -- the tiny "Send another" link is what they land on.
    return (
      <p id="contact-office" className="text-xs text-mist scroll-mt-4">
        <button
          type="button"
          onClick={() => setSent(false)}
          className="underline-offset-2 hover:text-cream hover:underline"
        >
          + Send another message
        </button>
      </p>
    )
  }

  return (
    <section id="contact-office" className="space-y-3 scroll-mt-4">
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
        <p className="text-[11px] text-mist/80 leading-snug">
          Your site number and contact details go privately to the office
          only. They aren&apos;t shown to other campers anywhere on RoadWave.
        </p>

        {/* Site number — required. Free text so RVs in alpha sites,
            tent loops, or named sections all work. */}
        <Field label="Site number" required>
          <input
            type="text"
            value={siteNumber}
            onChange={(e) => setSiteNumber(e.target.value)}
            onFocus={markStarted}
            maxLength={60}
            placeholder="e.g. 12, A-7, Birch 14"
            className={inputCls}
            required
            autoComplete="off"
          />
        </Field>

        {/* Name row — last name required, first optional. */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Last name" required>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onFocus={markStarted}
              maxLength={80}
              placeholder="Smith"
              className={inputCls}
              required
              autoComplete="family-name"
            />
          </Field>
          <Field label="First name">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onFocus={markStarted}
              maxLength={80}
              placeholder="Optional"
              className={inputCls}
              autoComplete="given-name"
            />
          </Field>
        </div>

        {/* Preferred contact method. Conditional phone/email rendering
            below keys off this. no_reply collapses both to keep the
            "I just want to flag something" path light. */}
        <div>
          <label className="mb-1 block text-xs font-medium text-cream">
            How should the office reach you?{' '}
            <span aria-hidden className="text-red-300">*</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { value: 'email', label: '📧 Email me' },
                { value: 'phone', label: '📞 Call me' },
                { value: 'text', label: '💬 Text me' },
                { value: 'no_reply', label: '🙅 No reply needed' },
              ] as { value: PreferredContactMethod; label: string }[]
            ).map((opt) => {
              const selected = preferredMethod === opt.value
              return (
                <label
                  key={opt.value}
                  className={
                    selected
                      ? 'inline-flex items-center gap-2 rounded-lg border border-flame bg-flame/15 px-3 py-2 text-xs font-semibold text-flame cursor-pointer'
                      : 'inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-cream cursor-pointer hover:border-white/20'
                  }
                >
                  <input
                    type="radio"
                    name="preferred_contact_method"
                    value={opt.value}
                    checked={selected}
                    onChange={() => {
                      setPreferredMethod(opt.value)
                      markStarted()
                    }}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              )
            })}
          </div>
        </div>

        {needsPhone && (
          <Field label="Phone number" required>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={markStarted}
              maxLength={60}
              placeholder="555-123-4567"
              className={inputCls}
              required
              autoComplete="tel"
              inputMode="tel"
            />
          </Field>
        )}
        {needsEmail && (
          <Field label="Email address" required>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={markStarted}
              maxLength={200}
              placeholder="you@example.com"
              className={inputCls}
              required
              autoComplete="email"
              inputMode="email"
            />
          </Field>
        )}

        {/* Category + message. Category required, message required. */}
        <div>
          <label className="mb-1 block text-xs font-medium text-cream">
            What&apos;s this about?{' '}
            <span aria-hidden className="text-red-300">*</span>
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
        <Field label="Your message" required>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={markStarted}
            rows={4}
            maxLength={2000}
            placeholder="What can the office help with?"
            className={textareaCls}
            required
          />
        </Field>

        {error && <p className="text-xs text-red-300">{error}</p>}
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

// Small labeled-field wrapper used inside the ContactOffice form so
// every input has the same vertical rhythm. The asterisk is rendered
// inside the label rather than the input so screen readers announce
// "(required)" via the input element's required attribute, not
// twice.
function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-cream">
        {label}
        {required && (
          <span aria-hidden className="text-red-300 ml-0.5">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared style tokens -- kept inline so this single file stays standalone.
// ---------------------------------------------------------------------------

const ctaCls =
  'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-5 py-3 text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors'

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame disabled:opacity-50'

const textareaCls = inputCls + ' resize-none'

const selectCls = inputCls
