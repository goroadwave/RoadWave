'use client'

import { useEffect, useRef, useState } from 'react'
import {
  appendCamperMessage,
  useCamperMessages,
} from '@/components/campgrounds/camper-message-storage'
import { CamperMessageTracker } from '@/components/campgrounds/camper-message-tracker'
import { DisclosureSection } from '@/components/campgrounds/disclosure-section'

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
//   4. Office Help & Messages — unified section combining the
//      persistent "Your messages with the office" tracker (when the
//      camper has prior threads on this device) AND the categorized
//      Contact Office form. Owns id="office-help" anchor and the
//      post-submit scroll target so a successful send lands the
//      camper on the new message card instead of being scrolled into
//      the footer.
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

  const showReview = reviewEnabled && !!reviewUrl
  const showFacebook = facebookEnabled && !!facebookUrl
  const showBooking = bookingEnabled && !!bookingUrl
  const showContact = contactEnabled
  const showPulse = pulseEnabled
  const showSupport = showReview || showFacebook || showBooking

  // The OfficeHelpSection self-decides whether to render: if the
  // owner has Contact Office turned off AND the camper has no
  // stored threads on this device, it returns null. Otherwise it
  // renders the unified section (heading + tracker + form). Mount
  // it unconditionally so a returning camper with stored threads
  // sees them even when other surfaces are all disabled.
  const officeHelpNode = (
    <OfficeHelpSection
      campgroundId={campgroundId}
      campgroundSlug={campgroundSlug}
      contactEnabled={showContact}
      previewMode={previewMode}
    />
  )

  if (!showReview && !showFacebook && !showBooking && !showContact && !showPulse) {
    return <div className="space-y-8">{officeHelpNode}</div>
  }

  return (
    <div className="space-y-8">
      {showPulse && (
        <PulseCheck campgroundId={campgroundId} previewMode={previewMode} />
      )}
      {showSupport && (
        // Phase 4b -- the Support This Campground section is now
        // collapsed by default in a DisclosureSection. The eyebrow +
        // helper copy that used to live inside SupportThisCampground
        // are now passed to the DisclosureSection as its title +
        // description, so there's no duplicate header inside the
        // accordion body.
        <DisclosureSection
          title="Support this campground"
          description="Enjoying your stay? Your feedback helps this campground grow."
        >
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
        </DisclosureSection>
      )}
      {officeHelpNode}
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
    // Phase 4b -- the outer <section> + eyebrow + helper copy used
    // to live here, but they're now provided by the parent
    // DisclosureSection (title="Support this campground" +
    // description). Stripped so there's no duplicate header inside
    // the accordion body.
    <div className="space-y-3">
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
    </div>
  )
}

// ---------------------------------------------------------------------------
// Office Help & Messages -- unified section
// ---------------------------------------------------------------------------
// Owns the single <section id="office-help"> wrapper and one heading
// for everything office-related: the persistent "Your messages with
// the office" tracker (CamperMessageTracker, which now renders bare
// cards with no section/heading of its own) AND the categorized
// Contact Office form.
//
// Layout rules per the spec:
//   * If the camper has any stored thread on this device -> tracker
//     cards render at the top; the form collapses behind a tiny
//     "+ Send another message" button below them. Tap to expand the
//     form; submit reverts to the collapsed state. The tracker card
//     above is the camper's success / "check replies" surface.
//   * If the camper has no stored thread on this device -> the form
//     is rendered directly (no toggle), so a first-time camper sees
//     the inputs immediately.
//   * On post-submit success the section's top is scrolled into
//     view (NOT the footer). The newly-created tracker card lands
//     at the top of the section, so the camper sees the
//     confirmation card without a jarring jump.
//
// Mount rule: renders nothing when the owner has Contact Office
// disabled AND the camper has no stored threads. That way the
// section only exists on the page when there's something useful in
// it -- and a returning camper still sees their thread even if the
// owner has toggled the form off in the meantime.

function OfficeHelpSection({
  campgroundId,
  campgroundSlug,
  contactEnabled,
  previewMode,
}: {
  campgroundId: string
  campgroundSlug: string | null
  contactEnabled: boolean
  previewMode: boolean
}) {
  const entries = useCamperMessages(campgroundId, previewMode)
  const hasEntries = entries.length > 0

  // Form expanded by default ONLY when there are no entries (so a
  // first-time camper goes straight to the form). When there's a
  // stored thread, start collapsed -- the camper most likely
  // returned to read a reply, not to send a new message.
  const [formOpen, setFormOpen] = useState(!hasEntries)
  const previousHadEntries = useRef(hasEntries)

  // Keep `formOpen` in sync with the entry list:
  //   * Transition from "no entries" -> "has entries" (camper just
  //     submitted): collapse the form. The tracker card above is the
  //     confirmation surface.
  //   * Transition from "has entries" -> "no entries" (cleared the
  //     last card on this device): expand so a returning camper
  //     doesn't have to tap "Send another" to type a fresh message.
  useEffect(() => {
    if (previousHadEntries.current === hasEntries) return
    setFormOpen(!hasEntries)
    previousHadEntries.current = hasEntries
  }, [hasEntries])

  // Nothing to render when both conditions hide it (no entries
  // stored AND the owner has the Contact form disabled).
  if (!contactEnabled && !hasEntries) return null

  return (
    <section id="office-help" className="space-y-3 scroll-mt-4">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        Office Help &amp; Messages
      </h2>

      {/* Tracker cards (the camper's stored threads on this device).
          Returns null when entries.length === 0 so we don't render
          an empty <div>. The cards include inline expand-to-thread
          + reply UX so the camper never leaves this section. */}
      <CamperMessageTracker
        campgroundId={campgroundId}
        previewMode={previewMode}
      />

      {contactEnabled && (
        <ContactOfficeBlock
          campgroundId={campgroundId}
          campgroundSlug={campgroundSlug}
          previewMode={previewMode}
          hasEntries={hasEntries}
          formOpen={formOpen}
          onOpenForm={() => setFormOpen(true)}
          onSubmitted={() => setFormOpen(false)}
        />
      )}
    </section>
  )
}

// Decides between the small "+ Send another message" trigger (when
// there's already a stored thread above and the camper hasn't
// requested the form) and the full form. After a successful submit
// the parent flips formOpen back to false so the camper falls back
// to the tracker card as the source of truth.

function ContactOfficeBlock({
  campgroundId,
  campgroundSlug,
  previewMode,
  hasEntries,
  formOpen,
  onOpenForm,
  onSubmitted,
}: {
  campgroundId: string
  campgroundSlug: string | null
  previewMode: boolean
  hasEntries: boolean
  formOpen: boolean
  onOpenForm: () => void
  onSubmitted: () => void
}) {
  // When the camper has a stored thread AND hasn't asked to compose
  // again, render the tiny trigger. The trigger doesn't include its
  // own anchor -- the parent section's id="office-help" is the only
  // scroll target on the page for this surface.
  if (hasEntries && !formOpen) {
    return (
      <p className="text-xs text-mist">
        <button
          type="button"
          onClick={onOpenForm}
          className="underline-offset-2 hover:text-cream hover:underline"
        >
          + Send another message
        </button>
      </p>
    )
  }

  return (
    <ContactOfficeForm
      campgroundId={campgroundId}
      campgroundSlug={campgroundSlug}
      previewMode={previewMode}
      onSubmitted={onSubmitted}
    />
  )
}

// ---------------------------------------------------------------------------
// Contact the Office -- form-only component
// ---------------------------------------------------------------------------

// Allowed values for preferred_contact_method. Mirrors mig 0052's
// CHECK constraint + the API's allow-list. Radio order: most-common
// first ("Email me back" tends to dominate).
type PreferredContactMethod = 'email' | 'phone' | 'text' | 'no_reply'

function ContactOfficeForm({
  campgroundId,
  campgroundSlug,
  previewMode,
  onSubmitted,
}: {
  campgroundId: string
  campgroundSlug: string | null
  previewMode: boolean
  /** Fires after a successful submit. The OfficeHelpSection wrapper
   *  flips back to the collapsed-trigger state so the tracker card
   *  above is the single visible confirmation surface. */
  onSubmitted: () => void
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
  const [startedLogged, setStartedLogged] = useState(false)

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
        // Body not JSON -- skip persistence, still show "Sent" UI.
      }
      if (replyId && replyToken) {
        // Persist to localStorage so the CamperMessageTracker can
        // render the new card immediately. Scoped per campground;
        // entries from other campgrounds aren't touched. The
        // tracker card above is the single rendering surface for
        // the camper's threads -- this form just collapses.
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
      // Reset all form fields so re-opening the form starts fresh.
      setSiteNumber('')
      setFirstName('')
      setLastName('')
      setPhone('')
      setEmail('')
      setPreferredMethod('')
      setCategory('')
      setBody('')
      // Hand control back to the parent: it flips formOpen to false
      // so the tracker card above becomes the only "Sent" surface.
      onSubmitted()
      // Smooth-scroll to the top of the unified section so the
      // camper SEES the newly-rendered card. Without this, after
      // the form collapses by ~700px the browser leaves the
      // scrollY where it was, dropping the camper into the
      // footer / "Meet Other Campers" accordion area. 80ms gives
      // React time to render the new tracker card so it's the
      // actual top of the section we scroll to.
      window.setTimeout(() => {
        document
          .getElementById('office-help')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
