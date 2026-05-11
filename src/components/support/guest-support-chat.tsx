'use client'

import { useGuestSupport, useGuestSupportRegister } from './guest-support-context'
import { SupportChat } from './support-chat'

// Guest-facing chat widget — Riley's chat panel. The trigger is
// Riley herself (the floating mascot in the bottom-right corner); a
// tap on Riley opens a "Chat with Riley" bubble that calls setOpen
// via GuestSupportContext. SupportChat renders the actual panel; we
// pass hideDefaultTrigger so it doesn't render its own floating
// button and conflict with Riley.

export function GuestSupportChat() {
  // Declare to the Provider (mounted in the root layout) that the
  // chat panel is now available on this surface so Riley's button
  // can open it directly instead of navigating away.
  useGuestSupportRegister()
  const { open, setOpen } = useGuestSupport()
  return (
    <SupportChat
      audience="guest"
      headerLabel="Chat with Riley 👋"
      triggerIcon="💬"
      triggerAriaLabel="Open chat with Riley"
      greeting="Hi! I'm Riley. Ask me anything about RoadWave — check-ins, waves, meetups, privacy, anything at all."
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
