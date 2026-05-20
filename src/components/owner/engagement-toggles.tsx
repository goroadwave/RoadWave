'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { setEngagementToggleAction } from '@/app/owner/(authed)/dashboard/engagement-actions'
import { Eyebrow } from '@/components/ui/eyebrow'

// Owner-facing on/off controls for the four Engagement Hub features
// plus the master email-notifications switch. Each row optimistically
// flips its visual state on tap, then calls the server action; if the
// action rejects we roll back the optimistic state to match the row's
// original value.

type ToggleColumn =
  | 'feature_review_enabled'
  | 'feature_book_again_enabled'
  | 'feature_contact_office_enabled'
  | 'feature_pulse_check_enabled'
  | 'feature_facebook_enabled'
  | 'email_notifications_enabled'

type Toggle = {
  column: ToggleColumn
  title: string
  description: string
  helpHref?: string
}

const FEATURE_TOGGLES: Toggle[] = [
  {
    column: 'feature_pulse_check_enabled',
    title: 'Stay Feedback (Pulse Check)',
    description:
      "A three-tap How's your stay? prompt on the welcome page. The third option opens a private message that lands in your inbox.",
  },
  {
    column: 'feature_review_enabled',
    title: 'Leave a Google Review button',
    description:
      'Linked to the Google Review URL on your Profile page. Hidden automatically until you add one.',
    helpHref: '/owner/profile',
  },
  {
    column: 'feature_book_again_enabled',
    title: 'Book Your Next Stay button',
    description:
      'Linked to the Booking URL on your Profile page. Add an optional message and promo code there too.',
    helpHref: '/owner/profile',
  },
  {
    column: 'feature_facebook_enabled',
    title: 'Recommend Us on Facebook button',
    description:
      'Linked to the Facebook URL on your Profile page. Hidden automatically until you add one. You can also customize the button label there.',
    helpHref: '/owner/profile',
  },
  {
    column: 'feature_contact_office_enabled',
    title: 'Contact the Office form',
    description:
      'Categorized contact form (Wi-Fi, Laundry, Maintenance, and six more) that lands in your inbox.',
  },
]

const EMAIL_TOGGLE: Toggle = {
  column: 'email_notifications_enabled',
  title: 'Email me new messages',
  description:
    'When on, you get a Resend email for every new contact-form or pulse-needs-attention message. Inbox is always the source of truth either way.',
}

type Props = {
  campgroundId: string
  initial: Record<ToggleColumn, boolean>
}

export function EngagementToggles({ campgroundId, initial }: Props) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <Eyebrow>Guest features</Eyebrow>
        <p className="text-sm text-mist leading-snug">
          Turn each guest feature on or off. When off, guests
          don&apos;t see it on your QR page at all.
        </p>
      </div>
      <ul className="rounded-2xl border border-white/5 bg-card divide-y divide-white/5 overflow-hidden">
        {FEATURE_TOGGLES.map((t) => (
          <ToggleRow
            key={t.column}
            campgroundId={campgroundId}
            toggle={t}
            initial={initial[t.column]}
          />
        ))}
      </ul>
      <ul className="rounded-2xl border border-white/5 bg-card overflow-hidden">
        <ToggleRow
          campgroundId={campgroundId}
          toggle={EMAIL_TOGGLE}
          initial={initial[EMAIL_TOGGLE.column]}
        />
      </ul>
      <p className="text-[11px] text-mist/70 leading-snug">
        Guest messages always appear in your{' '}
        <Link
          href="/owner/messages"
          className="text-flame underline-offset-2 hover:underline"
        >
          Messages
        </Link>{' '}
        inbox even when email notifications are off.
      </p>
    </section>
  )
}

function ToggleRow({
  campgroundId,
  toggle,
  initial,
}: {
  campgroundId: string
  toggle: Toggle
  initial: boolean
}) {
  const [checked, setChecked] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    const next = !checked
    setChecked(next)
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('campground_id', campgroundId)
      fd.set('column', toggle.column)
      fd.set('value', next ? 'true' : 'false')
      const result = await setEngagementToggleAction(
        { error: null, ok: false },
        fd,
      )
      if (result.error) {
        // Roll back to the row's original value if the server rejected.
        setChecked(initial)
        setError(result.error)
      }
    })
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 space-y-1">
        <p className="font-semibold text-cream text-sm">{toggle.title}</p>
        <p className="text-xs text-mist leading-snug">
          {toggle.description}
          {toggle.helpHref && (
            <>
              {' '}
              <Link
                href={toggle.helpHref}
                className="text-flame underline-offset-2 hover:underline"
              >
                Profile →
              </Link>
            </>
          )}
        </p>
        {error && <p className="text-[11px] text-red-300">{error}</p>}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        aria-pressed={checked}
        aria-label={`Toggle ${toggle.title}`}
        className={
          checked
            ? 'shrink-0 inline-flex items-center justify-end h-6 w-11 rounded-full bg-flame transition-colors disabled:opacity-60'
            : 'shrink-0 inline-flex items-center justify-start h-6 w-11 rounded-full bg-white/10 transition-colors disabled:opacity-60'
        }
      >
        <span
          aria-hidden
          className={
            checked
              ? 'mr-0.5 inline-block h-5 w-5 rounded-full bg-night transition-transform'
              : 'ml-0.5 inline-block h-5 w-5 rounded-full bg-cream transition-transform'
          }
        />
      </button>
    </li>
  )
}
