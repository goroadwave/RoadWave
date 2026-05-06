'use client'

import { SupportChat } from './support-chat'

// Guest-facing support widget. Renders only when the (app) layout has
// confirmed the visitor has an active check-in (the (app) layout is
// the one that decides whether to mount this component at all).

export function GuestSupportChat() {
  return (
    <SupportChat
      audience="guest"
      headerLabel="Ask RoadWave 👋"
      triggerIcon="💬"
      triggerAriaLabel="Open RoadWave support chat"
      greeting="Hi! Ask me anything about RoadWave — privacy modes, waving, check-ins, anything."
      reportButtonLabel="Report to RoadWave Team"
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
