'use client'

import { useGuestSupport } from './guest-support-context'
import { SupportChat } from './support-chat'

// Guest-facing support widget. The trigger now lives in AppNav (the
// "Help" tab) rather than as a floating button — the bottom-right
// corner is reserved for the Riley mascot. We pass externalOpen +
// setExternalOpen sourced from GuestSupportContext so the nav tab can
// open the panel, and hideDefaultTrigger so SupportChat doesn't render
// its own floating button.

export function GuestSupportChat() {
  const { open, setOpen } = useGuestSupport()
  return (
    <SupportChat
      audience="guest"
      headerLabel="Ask RoadWave 👋"
      triggerIcon="💬"
      triggerAriaLabel="Open RoadWave support chat"
      greeting="Hi! Ask me anything about RoadWave — privacy modes, waving, check-ins, anything."
      reportButtonLabel="Report to RoadWave Team"
      hideDefaultTrigger
      externalOpen={open}
      setExternalOpen={setOpen}
      theme={{
        buttonBg: '#F5A623',
        buttonShadow: '0 10px 28px rgba(245,166,35,0.35)',
        panelHeaderBg: 'rgba(245,166,35,0.10)',
        // Spec: green report button for the guest variant.
        reportButtonBg: '#4caf82',
      }}
    />
  )
}
