'use client'

import { useEffect } from 'react'
import { OWNER_MESSAGES_READ_EVENT } from '@/components/owner/owner-message-badge'

// Tiny client-side island mounted on /owner/messages. Fires once on
// mount to tell the nav badge "the inbox was just opened; refetch
// counts now instead of waiting for the 60s poll tick." Without this,
// the owner opens the page, the page's server-side auto-mark-as-read
// runs, but the nav badge keeps showing the old pulsing pill for up
// to a minute -- looks like a bug even though the data is correct.
//
// Render nothing; purely an event emitter.

export function OwnerMessagesReadSync() {
  useEffect(() => {
    // Fire on mount. The badge listens for this event and immediately
    // re-hits /api/owner/message-counts, which now returns 0 unread
    // because the page-render server action just flipped new -> read.
    document.dispatchEvent(new CustomEvent(OWNER_MESSAGES_READ_EVENT))
  }, [])

  return null
}
