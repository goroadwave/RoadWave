'use client'

// Tiny client island for outbound links on the Updates Only page
// that need to fire a campground_events row before navigating. Uses
// navigator.sendBeacon so the event POST is queued non-blockingly
// and the user's tap → new tab open isn't slowed.
//
// Kept stand-alone (vs. extracting WelcomeEngagement's internal
// logEvent helper) so the Updates page surface stays composable
// without dragging the entire engagement-hub state into a small
// outbound-link tracker.

type Props = {
  href: string
  campgroundId: string
  eventType: string
  children: React.ReactNode
  className?: string
  /** Open in a new tab; defaults to true for outbound campground links. */
  openInNewTab?: boolean
}

function logEvent(campgroundId: string, eventType: string) {
  if (typeof navigator === 'undefined') return
  const body = JSON.stringify({
    campground_id: campgroundId,
    event_type: eventType,
  })
  try {
    const blob = new Blob([body], { type: 'application/json' })
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/campground/event', blob)
      return
    }
  } catch {
    // Fall through to fetch on environments without Beacon support.
  }
  void fetch('/api/campground/event', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

export function TrackedLinkButton({
  href,
  campgroundId,
  eventType,
  children,
  className,
  openInNewTab = true,
}: Props) {
  return (
    <a
      href={href}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      onClick={() => logEvent(campgroundId, eventType)}
      className={className}
    >
      {children}
    </a>
  )
}
